import { useState, useEffect } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Compact header controls for the portal music player.
 * Sits between notifications and coach availability in the header bar.
 * Listens for state from PortalMusicPlayer via custom events.
 */
export const PortalMusicControls = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const handleState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsPlaying(detail.isPlaying);
      setTrackName(detail.trackName);
      setEnabled(detail.enabled);
    };

    window.addEventListener("portal-music-state", handleState);
    return () => window.removeEventListener("portal-music-state", handleState);
  }, []);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 px-1"
      >
        {/* Play/Pause */}
        <button
          onClick={() => window.dispatchEvent(new Event("portal-music-toggle"))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-accent"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Play className="h-3.5 w-3.5 text-primary ml-0.5" />
          )}
        </button>

        {/* Skip */}
        <button
          onClick={() => window.dispatchEvent(new Event("portal-music-skip"))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-accent"
          title="Next track"
        >
          <SkipForward className="h-3.5 w-3.5 text-primary" />
        </button>

        {/* Equaliser indicator when playing */}
        {isPlaying && (
          <div className="flex gap-[2px] items-end h-4 ml-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-[2px] rounded-sm bg-primary"
                animate={{ height: ["3px", `${8 + i * 2}px`, "3px"] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + i * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
