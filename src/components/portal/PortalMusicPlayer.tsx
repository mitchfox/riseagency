import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";

interface MusicTrack {
  url: string;
  name: string;
}

interface PortalMusicPlayerProps {
  tracks: MusicTrack[];
  enabled: boolean;
}

/**
 * NFSU2-inspired music player for the portal.
 * - Autoplays on portal open (requires prior user gesture to unlock AudioContext)
 * - Slides in a "Now Playing" HUD from the bottom-right when a new track starts
 * - Fades music when portal videos play
 * - Exposes header controls via a global event bus
 */
export const PortalMusicPlayer = ({ tracks, enabled }: PortalMusicPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [fadedOut, setFadedOut] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volume = useRef(0.35);
  const hasAutoPlayed = useRef(false);
  const failedUrls = useRef<Set<string>>(new Set());

  const validTracks = tracks.filter(t => t.url && !failedUrls.current.has(t.url));
  const currentTrack = validTracks[currentIndex % validTracks.length] || null;

  // Flash the NFSU2 HUD
  const flashHUD = useCallback(() => {
    setShowHUD(true);
    if (hudTimer.current) clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setShowHUD(false), 5000);
  }, []);

  // Play a specific track
  const playTrack = useCallback((index: number) => {
    if (!audioRef.current || validTracks.length === 0) return;
    const track = validTracks[index % validTracks.length];
    if (!track) return;

    const audio = audioRef.current;
    audio.src = track.url;
    audio.volume = volume.current;
    audio.load();
    audio.play().then(() => {
      setIsPlaying(true);
      setCurrentIndex(index % validTracks.length);
      flashHUD();
    }).catch((err) => {
      // Don't mark as failed for autoplay policy blocks (NotAllowedError)
      // Only mark as failed for actual media errors
      if (err?.name === 'NotAllowedError') {
        // Autoplay blocked - just set index without playing
        setCurrentIndex(index % validTracks.length);
        setIsPlaying(false);
      } else {
        failedUrls.current.add(track.url);
        if (validTracks.length > 1) {
          playTrack((index + 1) % validTracks.length);
        }
      }
    });
  }, [validTracks, flashHUD]);

  // Skip to next
  const handleSkip = useCallback(() => {
    if (validTracks.length === 0) return;
    const next = (currentIndex + 1) % validTracks.length;
    playTrack(next);
  }, [currentIndex, validTracks.length, playTrack]);

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (currentTrack) {
      audioRef.current.volume = volume.current;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        flashHUD();
      }).catch(() => {});
    }
  }, [isPlaying, currentTrack, flashHUD]);

  // Auto-advance on track end
  const handleEnded = useCallback(() => {
    if (validTracks.length > 1) {
      handleSkip();
    } else if (validTracks.length === 1) {
      // Replay single track
      playTrack(0);
    }
  }, [validTracks.length, handleSkip, playTrack]);

  // Handle load errors
  const handleError = useCallback(() => {
    if (currentTrack) {
      failedUrls.current.add(currentTrack.url);
      if (validTracks.length > 1) {
        handleSkip();
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack, validTracks.length, handleSkip]);

  // Autoplay on portal open
  useEffect(() => {
    if (!enabled || validTracks.length === 0 || hasAutoPlayed.current) return;
    hasAutoPlayed.current = true;

    // Create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }

    // Small delay to let portal render, then autoplay
    const timer = setTimeout(() => {
      playTrack(0);
    }, 1500);

    return () => clearTimeout(timer);
  }, [enabled, validTracks.length, playTrack]);

  // Expose controls globally for header buttons
  useEffect(() => {
    const handleGlobalPlay = () => handlePlayPause();
    const handleGlobalSkip = () => handleSkip();

    window.addEventListener("portal-music-toggle", handleGlobalPlay);
    window.addEventListener("portal-music-skip", handleGlobalSkip);

    // Broadcast state for header
    const broadcastState = () => {
      window.dispatchEvent(new CustomEvent("portal-music-state", {
        detail: { isPlaying, trackName: currentTrack?.name || "", enabled: enabled && validTracks.length > 0 }
      }));
    };
    broadcastState();

    return () => {
      window.removeEventListener("portal-music-toggle", handleGlobalPlay);
      window.removeEventListener("portal-music-skip", handleGlobalSkip);
    };
  }, [handlePlayPause, handleSkip, isPlaying, currentTrack, enabled, validTracks.length]);

  // Broadcast state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("portal-music-state", {
      detail: { isPlaying, trackName: currentTrack?.name || "", enabled: enabled && validTracks.length > 0 }
    }));
  }, [isPlaying, currentTrack, enabled, validTracks.length]);

  // Video fade logic
  useEffect(() => {
    if (!enabled) return;

    const handleVideoPlay = () => {
      setFadedOut(true);
      if (audioRef.current && isPlaying) {
        const fade = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.02) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.04);
          } else {
            clearInterval(fade);
            audioRef.current?.pause();
          }
        }, 40);
      }
    };

    const handleVideoPause = () => {
      setFadedOut(false);
      if (audioRef.current && isPlaying) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        const fade = setInterval(() => {
          if (audioRef.current && audioRef.current.volume < volume.current - 0.02) {
            audioRef.current.volume = Math.min(volume.current, audioRef.current.volume + 0.04);
          } else {
            if (audioRef.current) audioRef.current.volume = volume.current;
            clearInterval(fade);
          }
        }, 40);
      }
    };

    const observer = new MutationObserver(() => {
      document.querySelectorAll("video").forEach((v) => {
        if (!(v as any).__musicFade) {
          v.addEventListener("play", handleVideoPlay);
          v.addEventListener("pause", handleVideoPause);
          v.addEventListener("ended", handleVideoPause);
          (v as any).__musicFade = true;
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll("video").forEach((v) => {
      v.addEventListener("play", handleVideoPlay);
      v.addEventListener("pause", handleVideoPause);
      v.addEventListener("ended", handleVideoPause);
      (v as any).__musicFade = true;
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (hudTimer.current) clearTimeout(hudTimer.current);
    };
  }, []);

  if (!enabled || validTracks.length === 0) return null;

  return (
    <>
      {/* Hidden audio with event handlers */}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
        style={{ display: "none" }}
      />

      {/* ═══ NFSU2 "Now Playing" HUD ═══ */}
      <AnimatePresence>
        {showHUD && !fadedOut && (
          <motion.div
            initial={{ x: 400, opacity: 0, skewX: -2 }}
            animate={{ x: 0, opacity: 1, skewX: 0 }}
            exit={{ x: 400, opacity: 0, skewX: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="fixed bottom-24 md:bottom-8 right-0 z-[60]"
          >
            {/* Main HUD container - NFSU2 angular style */}
            <div className="relative w-80 overflow-hidden">
              {/* Diagonal cut background */}
              <div
                className="relative overflow-hidden"
                style={{
                  clipPath: "polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)",
                }}
              >
                {/* Dark backdrop with blue/gold gradient accent */}
                <div
                  className="px-8 py-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--background) / 0.97) 0%, hsl(220 20% 8% / 0.98) 60%, hsl(220 30% 12% / 0.95) 100%)",
                  }}
                >
                  {/* Top accent line - electric blue to gold */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: "linear-gradient(90deg, transparent 5%, hsl(200 100% 50%) 30%, hsl(43 49% 61%) 70%, transparent 95%)",
                    }}
                  />

                  {/* "NOW PLAYING" label */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Animated equaliser bars */}
                    <div className="flex gap-[2px] items-end h-4">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-[2px] rounded-sm"
                          style={{ backgroundColor: "hsl(43 49% 61%)" }}
                          animate={
                            isPlaying
                              ? { height: ["3px", `${6 + i * 3}px`, "3px"] }
                              : { height: "3px" }
                          }
                          transition={{
                            repeat: Infinity,
                            duration: 0.5 + i * 0.1,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-[10px] font-bebas tracking-[0.3em] uppercase"
                      style={{ color: "hsl(43 49% 61%)" }}
                    >
                      Now Playing
                    </span>
                  </div>

                  {/* Track name - large, bold */}
                  <p className="text-sm font-bold text-foreground truncate tracking-wide">
                    {currentTrack?.name || "Unknown Track"}
                  </p>

                  {/* Subtle progress shimmer */}
                  <motion.div
                    className="h-[1px] mt-2 rounded-full"
                    style={{ backgroundColor: "hsl(43 49% 61% / 0.3)" }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 4.5, ease: "linear" }}
                  />

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{
                      background: "linear-gradient(90deg, transparent 5%, hsl(43 49% 61% / 0.4) 50%, transparent 95%)",
                    }}
                  />
                </div>
              </div>

              {/* Angular side accent */}
              <div
                className="absolute top-0 left-0 w-[3px] h-full"
                style={{
                  background: "linear-gradient(180deg, hsl(200 100% 50%), hsl(43 49% 61%))",
                  clipPath: "polygon(0 5%, 100% 0%, 100% 100%, 0 95%)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
