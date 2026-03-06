import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";

interface MusicTrack {
  url: string;
  name: string;
}

interface PortalMusicPlayerProps {
  tracks: MusicTrack[];
  enabled: boolean;
}

export const PortalMusicPlayer = ({ tracks, enabled }: PortalMusicPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [fadedOut, setFadedOut] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volume = useRef(0.4);

  const currentTrack = tracks[currentIndex] || null;

  // Listen for video/clip playback events to fade music out
  useEffect(() => {
    if (!enabled) return;

    const handleVideoPlay = () => {
      setFadedOut(true);
      if (audioRef.current) {
        // Fade volume down
        const fade = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.02) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
          } else {
            clearInterval(fade);
            audioRef.current?.pause();
          }
        }, 50);
      }
    };

    const handleVideoPause = () => {
      setFadedOut(false);
      if (audioRef.current && isPlaying) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        // Fade volume back up
        const fade = setInterval(() => {
          if (audioRef.current && audioRef.current.volume < volume.current - 0.02) {
            audioRef.current.volume = Math.min(volume.current, audioRef.current.volume + 0.05);
          } else {
            if (audioRef.current) audioRef.current.volume = volume.current;
            clearInterval(fade);
          }
        }, 50);
      }
    };

    // Listen on all video elements
    const observer = new MutationObserver(() => {
      document.querySelectorAll("video").forEach((v) => {
        if (!(v as any).__musicListener) {
          v.addEventListener("play", handleVideoPlay);
          v.addEventListener("pause", handleVideoPause);
          v.addEventListener("ended", handleVideoPause);
          (v as any).__musicListener = true;
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    // Attach to existing videos
    document.querySelectorAll("video").forEach((v) => {
      v.addEventListener("play", handleVideoPlay);
      v.addEventListener("pause", handleVideoPause);
      v.addEventListener("ended", handleVideoPause);
      (v as any).__musicListener = true;
    });

    return () => {
      observer.disconnect();
      document.querySelectorAll("video").forEach((v) => {
        v.removeEventListener("play", handleVideoPlay);
        v.removeEventListener("pause", handleVideoPause);
        v.removeEventListener("ended", handleVideoPause);
      });
    };
  }, [enabled, isPlaying]);

  const showAndHide = useCallback(() => {
    setShowWidget(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowWidget(false), 4000);
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = volume.current;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      showAndHide();
    }
  };

  const handleSkip = () => {
    if (tracks.length === 0) return;
    const next = (currentIndex + 1) % tracks.length;
    setCurrentIndex(next);
    if (audioRef.current) {
      audioRef.current.src = tracks[next].url;
      if (isPlaying) {
        audioRef.current.volume = volume.current;
        audioRef.current.play().catch(() => {});
        showAndHide();
      }
    }
  };

  const handleEnded = () => {
    if (tracks.length > 1) {
      handleSkip();
    } else {
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!enabled || tracks.length === 0) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Floating trigger button - always visible bottom-right */}
      <motion.button
        onClick={() => {
          if (!isPlaying) handlePlayPause();
          else setShowWidget((v) => !v);
        }}
        className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-border/50 backdrop-blur-md"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: fadedOut ? 0.3 : 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        <Music className="h-4 w-4 text-primary" />
        {isPlaying && !fadedOut && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.button>

      {/* NFS Underground 2 style "Now Playing" widget */}
      <AnimatePresence>
        {showWidget && !fadedOut && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-32 right-4 z-50 w-64 overflow-hidden rounded-xl border border-primary/20 shadow-2xl backdrop-blur-xl"
            style={{
              background: "linear-gradient(145deg, hsl(var(--card) / 0.95) 0%, hsl(var(--background) / 0.9) 100%)",
              boxShadow: "0 0 30px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.1)",
            }}
          >
            {/* Top accent bar */}
            <div
              className="h-0.5 w-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
              }}
            />

            <div className="p-3">
              {/* Now Playing label */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex gap-[2px]">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-primary"
                      animate={
                        isPlaying
                          ? { height: ["4px", `${8 + i * 3}px`, "4px"] }
                          : { height: "4px" }
                      }
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + i * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold">
                  Now Playing
                </span>
              </div>

              {/* Track name */}
              <p className="text-sm font-semibold text-foreground truncate mb-3">
                {currentTrack?.name || "Unknown Track"}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePlayPause}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-primary ml-0.5" />
                  )}
                </button>
                {tracks.length > 1 && (
                  <button
                    onClick={handleSkip}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <SkipForward className="h-3.5 w-3.5 text-primary" />
                  </button>
                )}
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors ml-auto"
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom accent */}
            <div
              className="h-0.5 w-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
