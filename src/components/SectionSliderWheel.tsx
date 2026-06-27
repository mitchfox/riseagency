import { useEffect, useRef, useState } from "react";
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

  // Live drag state — updates as the user drags so the wheel visibly
  // moves under the finger / cursor instead of waiting for release.
  const [drag, setDrag] = useState(0);
  const dragRef = useRef<{ start: number; pointerId: number | null }>({ start: 0, pointerId: null });
  // One full slot must be wide enough that adjacent labels don't visually
  // overlap with the centred active one. The button has a min-width of
  // 170px (sm: 210px) so we use 200 to give each label its own runway.
  const SLOT = 200;
  const STEP_THRESHOLD = 60;

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
          className="relative flex h-14 flex-1 touch-pan-y items-center justify-center overflow-hidden [perspective:520px] cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            dragRef.current = { start: e.clientX, pointerId: e.pointerId };
            setDrag(0);
          }}
          onPointerMove={(e) => {
            if (dragRef.current.pointerId !== e.pointerId) return;
            const dx = e.clientX - dragRef.current.start;
            // Limit live drag travel to ~1.5 slots so it stays readable.
            const clamped = Math.max(-SLOT * 1.5, Math.min(SLOT * 1.5, dx));
            setDrag(clamped);
            // Commit a step crossing without releasing.
            if (clamped >= STEP_THRESHOLD) {
              dragRef.current.start = e.clientX;
              setDrag(0);
              move(-1);
            } else if (clamped <= -STEP_THRESHOLD) {
              dragRef.current.start = e.clientX;
              setDrag(0);
              move(1);
            }
          }}
          onPointerUp={(e) => {
            dragRef.current.pointerId = null;
            setDrag(0);
          }}
          onPointerCancel={() => {
            dragRef.current.pointerId = null;
            setDrag(0);
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map(({ offset, section }) => {
              const isCenter = offset === 0;
              const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.62 : 0.26;
              const translateX = offset * SLOT + drag;
              // Drag rotates the wheel by up to ~30° each side as the
              // user pulls; snaps back when released or after commit.
              const dragRotate = (drag / SLOT) * 30;
              const rotateY = offset * -42 + scrollSpin + dragRotate;
              const scale = isCenter ? 1 : Math.abs(offset) === 1 ? 0.82 : 0.66;
              return (
                <motion.button
                  type="button"
                  key={section.key}
                  initial={{ opacity: 0, scale: 0.72 }}
                  animate={{ opacity, x: translateX, rotateY, scale, z: isCenter ? 42 : -50 }}
                  exit={{ opacity: 0 }}
                  transition={
                    dragRef.current.pointerId !== null
                      ? { duration: 0, ease: "linear" }
                      : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                  }
                  onClick={() => onChange(section.key)}
                  className="absolute inline-flex min-w-[170px] items-center justify-center gap-3 whitespace-nowrap px-4 text-center font-bebas text-xs uppercase tracking-[0.18em] text-primary sm:min-w-[210px] sm:text-sm"
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
