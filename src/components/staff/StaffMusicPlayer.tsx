import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipForward, Music, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MusicTrack {
  url: string;
  name: string;
  playerName?: string;
}

/**
 * Staff-side music player: aggregates all player tracks.
 * NFSU2-style "Now Playing" HUD + header controls.
 */
export const StaffMusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volume = useRef(0.3);
  const failedUrls = useRef<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch all player tracks
  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase
        .from("player_portal_settings")
        .select("music_tracks, player_id")
        .not("music_tracks", "is", null);

      if (!data) return;

      // Also fetch player names
      const playerIds = data.map(d => d.player_id);
      const { data: players } = await supabase
        .from("players")
        .select("id, name")
        .in("id", playerIds);

      const nameMap = new Map(players?.map(p => [p.id, p.name]) || []);

      const allTracks: MusicTrack[] = [];
      for (const row of data) {
        const musicTracks = row.music_tracks as any[];
        if (!Array.isArray(musicTracks)) continue;
        for (const t of musicTracks) {
          if (t.url) {
            allTracks.push({
              url: t.url,
              name: t.name || "Track",
              playerName: nameMap.get(row.player_id) || "Unknown",
            });
          }
        }
      }
      setTracks(allTracks);
    };
    fetchTracks();
  }, []);

  const validTracks = tracks.filter(t => !failedUrls.current.has(t.url));
  const currentTrack = validTracks[currentIndex % Math.max(validTracks.length, 1)] || null;

  const flashHUD = useCallback(() => {
    setShowHUD(true);
    if (hudTimer.current) clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setShowHUD(false), 5000);
  }, []);

  const playTrack = useCallback((index: number) => {
    if (validTracks.length === 0) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
      audioRef.current.addEventListener("ended", () => {
        window.dispatchEvent(new Event("staff-music-ended"));
      });
      audioRef.current.addEventListener("error", () => {
        window.dispatchEvent(new Event("staff-music-error"));
      });
    }
    const audio = audioRef.current;
    const track = validTracks[index % validTracks.length];
    if (!track) return;
    audio.src = track.url;
    audio.volume = volume.current;
    audio.load();
    audio.play().then(() => {
      setIsPlaying(true);
      setCurrentIndex(index % validTracks.length);
      flashHUD();
    }).catch((err) => {
      if (err?.name === 'NotAllowedError') {
        setCurrentIndex(index % validTracks.length);
        setIsPlaying(false);
      } else {
        failedUrls.current.add(track.url);
        if (validTracks.length > 1) playTrack((index + 1) % validTracks.length);
      }
    });
  }, [validTracks, flashHUD]);

  const handleSkip = useCallback(() => {
    if (validTracks.length === 0) return;
    playTrack((currentIndex + 1) % validTracks.length);
  }, [currentIndex, validTracks.length, playTrack]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (currentTrack) {
      if (!audioRef.current) {
        playTrack(currentIndex);
        return;
      }
      audioRef.current.volume = volume.current;
      if (!audioRef.current.src || audioRef.current.src !== currentTrack.url) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.load();
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        flashHUD();
      }).catch(() => {});
    } else if (validTracks.length > 0) {
      playTrack(0);
    }
  }, [isPlaying, currentTrack, currentIndex, flashHUD, validTracks.length, playTrack]);

  // Handle ended/error via custom events (since Audio is created programmatically)
  useEffect(() => {
    const onEnded = () => {
      if (validTracks.length > 1) {
        const next = (currentIndex + 1) % validTracks.length;
        playTrack(next);
      } else if (validTracks.length === 1) {
        playTrack(0);
      }
    };
    const onError = () => {
      const track = validTracks[currentIndex % validTracks.length];
      if (track) {
        failedUrls.current.add(track.url);
        if (validTracks.length > 1) {
          const next = (currentIndex + 1) % validTracks.length;
          playTrack(next);
        } else {
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener("staff-music-ended", onEnded);
    window.addEventListener("staff-music-error", onError);
    return () => {
      window.removeEventListener("staff-music-ended", onEnded);
      window.removeEventListener("staff-music-error", onError);
    };
  }, [currentIndex, validTracks, playTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (hudTimer.current) clearTimeout(hudTimer.current);
    };
  }, []);

  if (validTracks.length === 0) return null;

  return (
    <>

      {/* Header controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handlePlayPause}
          title={isPlaying ? "Pause music" : "Play music"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Music className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {isPlaying && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleSkip}
            title="Skip track"
          >
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* NFSU2 "Now Playing" HUD */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ x: 400, opacity: 0, skewX: -2 }}
            animate={{ x: 0, opacity: 1, skewX: 0 }}
            exit={{ x: 400, opacity: 0, skewX: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="fixed bottom-24 md:bottom-8 right-0 z-[60]"
          >
            <div className="relative w-80 overflow-hidden">
              <div
                className="relative overflow-hidden"
                style={{
                  clipPath: "polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%)",
                }}
              >
                <div
                  className="px-8 py-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--background) / 0.97) 0%, hsl(220 20% 8% / 0.98) 60%, hsl(220 30% 12% / 0.95) 100%)",
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: "linear-gradient(90deg, transparent 5%, hsl(200 100% 50%) 30%, hsl(43 49% 61%) 70%, transparent 95%)",
                    }}
                  />
                  <div className="flex items-center gap-2 mb-1.5">
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
                  <p className="text-sm font-bold text-foreground truncate tracking-wide">
                    {currentTrack?.name || "Unknown Track"}
                  </p>
                  {currentTrack?.playerName && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {currentTrack.playerName}'s playlist
                    </p>
                  )}
                  <motion.div
                    className="h-[1px] mt-2 rounded-full"
                    style={{ backgroundColor: "hsl(43 49% 61% / 0.3)" }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 4.5, ease: "linear" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{
                      background: "linear-gradient(90deg, transparent 5%, hsl(43 49% 61% / 0.4) 50%, transparent 95%)",
                    }}
                  />
                </div>
              </div>
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

/**
 * Small settings button for the footer — opens the music settings popover.
 */
export const StaffMusicSettingsButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 hidden md:flex"
      onClick={onClick}
      title="Music settings"
    >
      <Music className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};
