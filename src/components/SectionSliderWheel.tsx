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

  const wrap = (i: number) => (i + total) % total;
  const move = (delta: number) => onChange(sections[wrap(idx + delta)].key);

  // Show prev2, prev, current, next, next2
  const visible = [-2, -1, 0, 1, 2].map((offset) => ({
    offset,
    section: sections[wrap(idx + offset)],
  }));

  return (
    <div className="relative w-full select-none" style={{ perspective: "800px" }}>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous section"
          onClick={() => move(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          className="relative flex h-10 flex-1 items-center justify-center overflow-hidden"
          onTouchStart={(e) => {
            (e.currentTarget as any)._sx = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const sx = (e.currentTarget as any)._sx;
            if (sx == null) return;
            const dx = e.changedTouches[0].clientX - sx;
            if (Math.abs(dx) > 30) move(dx < 0 ? 1 : -1);
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map(({ offset, section }) => {
              const isCenter = offset === 0;
              const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.6 : 0.2;
              const rotateY = offset * 35;
              const translateX = offset * 70;
              return (
                <motion.button
                  type="button"
                  key={`${section.key}-${offset}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity, rotateY, x: translateX }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onChange(section.key)}
                  className="absolute inline-flex items-center gap-2 whitespace-nowrap font-bebas uppercase tracking-[0.18em] text-primary text-xs sm:text-sm"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <span>{section.label}</span>
                  {!isCenter && Math.abs(offset) === 1 && (
                    <span className="text-primary/70">•</span>
                  )}
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
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
