import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface AudioPlaybackButtonProps {
  audioUrl: string;
}

// Global registry so only one commentary track plays at a time
let currentlyPlayingButton: (() => void) | null = null;

export const AudioPlaybackButton = ({ audioUrl }: AudioPlaybackButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      if (currentlyPlayingButton === stopPlayback) currentlyPlayingButton = null;
      return;
    }

    if (currentlyPlayingButton) currentlyPlayingButton();

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 2.2;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
    } catch {
      audio.volume = 1;
    }

    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
      if (currentlyPlayingButton === stopPlayback) currentlyPlayingButton = null;
    };

    audio.play().then(() => {
      audioRef.current = audio;
      setIsPlaying(true);
      currentlyPlayingButton = stopPlayback;
    }).catch(() => setIsPlaying(false));
  }, [audioUrl, isPlaying, stopPlayback]);

  const barVariants = {
    playing: (i: number) => ({
      scaleY: [0.3, 1, 0.5, 0.8, 0.3],
      transition: {
        duration: 0.8 + i * 0.15,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    }),
    stopped: { scaleY: 0.3 },
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center gap-1.5 rounded-full backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
      style={{
        width: 40,
        height: 40,
        backgroundColor: isPlaying ? 'hsl(var(--primary))' : 'hsl(var(--background) / 0.7)',
        color: isPlaying ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))',
        border: '2px solid hsl(var(--primary))',
      }}
      title={isPlaying ? "Stop audio" : "Listen"}
    >
      {isPlaying ? (
        <div className="flex h-3 items-end gap-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              custom={i}
              variants={barVariants}
              animate="playing"
              className="w-[2.5px] origin-bottom rounded-full bg-primary-foreground"
              style={{ height: '100%' }}
            />
          ))}
        </div>
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </button>
  );
};
