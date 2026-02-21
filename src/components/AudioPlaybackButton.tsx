import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface AudioPlaybackButtonProps {
  audioUrl: string;
}

/**
 * A floating audio playback button that plays audio and continues
 * even when the user scrolls away. Press again to replay after finishing.
 */
export const AudioPlaybackButton = ({ audioUrl }: AudioPlaybackButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggle = useCallback(async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    audio.src = audioUrl;
    audio.onended = () => setIsPlaying(false);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      // Autoplay blocked
    }
  }, [audioUrl, isPlaying]);

  return (
    <motion.button
      onClick={handleToggle}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-primary text-sm font-bebas tracking-wider transition-colors"
      style={{
        backgroundColor: isPlaying ? 'hsl(var(--primary))' : 'transparent',
        color: isPlaying ? 'black' : 'hsl(var(--primary))',
      }}
      whileTap={{ scale: 0.95 }}
      title={isPlaying ? "Stop audio" : "Play audio"}
    >
      <Volume2 className="w-4 h-4" />
      {isPlaying ? "Playing..." : "Listen"}
      {isPlaying && (
        <span className="flex gap-0.5 ml-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-0.5 bg-black rounded-full"
              animate={{ height: [4, 12, 4] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </span>
      )}
    </motion.button>
  );
};
