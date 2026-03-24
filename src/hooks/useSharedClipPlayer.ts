import { useRef, useState, useCallback, useEffect } from 'react';

export interface ClipWindow {
  videoUrl: string;
  clipStart: number;
  clipEnd: number;
}

export interface SharedClipPlayerState {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  progress: number;
  currentClip: ClipWindow | null;
  playClip: (clip: ClipWindow) => void;
  togglePlayPause: () => void;
  seekToRatio: (ratio: number) => void;
  stop: () => void;
}

/**
 * Shared clip player: one <video> element, many clip windows.
 * Load the source once per unique URL, then seek for each clip.
 */
export const useSharedClipPlayer = (): SharedClipPlayerState => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedSourceRef = useRef<string | null>(null);
  const currentClipRef = useRef<ClipWindow | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState<ClipWindow | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startBoundaryEnforcement = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      const vid = videoRef.current;
      const clip = currentClipRef.current;
      if (!vid || !clip) return;

      const { clipStart, clipEnd } = clip;
      const duration = clipEnd - clipStart;

      if (vid.currentTime >= clipEnd) {
        vid.pause();
        vid.currentTime = clipStart;
        setIsPlaying(false);
        setProgress(1);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      if (vid.currentTime < clipStart) {
        vid.currentTime = clipStart;
      }

      setProgress(Math.min(1, (vid.currentTime - clipStart) / duration));
    }, 100);
  }, []);

  const playClip = useCallback((clip: ClipWindow) => {
    const vid = videoRef.current;
    if (!vid) return;

    // Guard against invalid clip windows
    if (!clip.videoUrl || clip.clipEnd <= clip.clipStart || clip.clipStart < 0) {
      console.warn('Invalid clip window:', clip);
      return;
    }

    currentClipRef.current = clip;
    setCurrentClip(clip);
    setProgress(0);

    // Pause first — always
    vid.pause();

    const seekAndPlay = () => {
      const onSeeked = () => {
        vid.play().catch(() => {});
        setIsPlaying(true);
        startBoundaryEnforcement();
      };

      // CRITICAL: attach listener BEFORE setting currentTime
      // If currentTime is already at clipStart, seeked won't fire — handle that
      if (Math.abs(vid.currentTime - clip.clipStart) < 0.05) {
        // Already at the right position, just play
        onSeeked();
      } else {
        vid.addEventListener('seeked', onSeeked, { once: true });
        vid.currentTime = clip.clipStart;
      }
    };

    // If same source, just seek
    if (loadedSourceRef.current === clip.videoUrl && vid.readyState >= 1) {
      seekAndPlay();
      return;
    }

    // Different source — load it once
    loadedSourceRef.current = clip.videoUrl;
    vid.src = clip.videoUrl;

    const onLoadedMetadata = () => {
      seekAndPlay();
    };

    vid.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    vid.load();
  }, [startBoundaryEnforcement]);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    const clip = currentClipRef.current;
    if (!vid || !clip) return;

    if (vid.paused) {
      // If at or past clip end, restart from clip start
      if (vid.currentTime >= clip.clipEnd || vid.currentTime < clip.clipStart) {
        vid.currentTime = clip.clipStart;
      }
      vid.play().catch(() => {});
      setIsPlaying(true);
      startBoundaryEnforcement();
    } else {
      vid.pause();
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [startBoundaryEnforcement]);

  const seekToRatio = useCallback((ratio: number) => {
    const vid = videoRef.current;
    const clip = currentClipRef.current;
    if (!vid || !clip) return;

    const clamped = Math.max(0, Math.min(1, ratio));
    const duration = clip.clipEnd - clip.clipStart;
    vid.currentTime = clip.clipStart + clamped * duration;
    setProgress(clamped);
  }, []);

  const stop = useCallback(() => {
    const vid = videoRef.current;
    if (vid) vid.pause();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setProgress(0);
    currentClipRef.current = null;
    setCurrentClip(null);
  }, []);

  return {
    videoRef,
    isPlaying,
    progress,
    currentClip,
    playClip,
    togglePlayPause,
    seekToRatio,
    stop,
  };
};
