import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

export interface ClipWindow {
  videoUrl: string;
  clipStart: number;
  clipEnd: number;
}

export interface SharedClipPlayerState {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  isClipReady: boolean;
  clipError: string | null;
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
  const seekTimeoutRef = useRef<number | null>(null);
  const playRequestRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isClipReady, setIsClipReady] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState<ClipWindow | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };
  }, []);

  const clearSeekTimeout = useCallback(() => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
  }, []);

  const failClosed = useCallback((message: string) => {
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    }

    loadedSourceRef.current = null;
    currentClipRef.current = null;
    setCurrentClip(null);
    setIsPlaying(false);
    setIsClipReady(false);
    setProgress(0);
    setClipError(message);
    clearSeekTimeout();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [clearSeekTimeout]);

  const startBoundaryEnforcement = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      const vid = videoRef.current;
      const clip = currentClipRef.current;
      if (!vid || !clip) return;

      const { clipStart, clipEnd } = clip;
      const duration = clipEnd - clipStart;

      if (vid.currentTime < clipStart - 0.35 || vid.currentTime > clipEnd + 0.35) {
        failClosed('Clip unavailable. Full match playback has been blocked.');
        return;
      }

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
  }, [failClosed]);

  const playClip = useCallback((clip: ClipWindow) => {
    const vid = videoRef.current;
    if (!vid) return;
    const requestId = ++playRequestRef.current;

    // Guard against invalid clip windows
    if (!clip.videoUrl || clip.clipEnd <= clip.clipStart || clip.clipStart < 0) {
      console.warn('Invalid clip window:', clip);
      failClosed('Clip unavailable. Full match playback has been blocked.');
      return;
    }

    currentClipRef.current = clip;
    setCurrentClip(clip);
    setProgress(0);
    setIsClipReady(false);
    setClipError(null);
    clearSeekTimeout();

    // Pause first — always
    vid.pause();

    const verifyAndPlay = () => {
      if (playRequestRef.current !== requestId) return;

      const activeClip = currentClipRef.current;
      if (!activeClip) {
        failClosed('Clip unavailable. Full match playback has been blocked.');
        return;
      }

      const landedInsideClip =
        vid.currentTime >= activeClip.clipStart - 0.35 &&
        vid.currentTime <= activeClip.clipEnd + 0.35;

      if (!landedInsideClip) {
        failClosed('Clip unavailable. Full match playback has been blocked.');
        return;
      }

      setIsClipReady(true);
      setClipError(null);
      vid.play().then(() => {
        if (playRequestRef.current !== requestId) {
          vid.pause();
          return;
        }
        setIsPlaying(true);
        startBoundaryEnforcement();
      }).catch(() => {
        failClosed('Clip unavailable. Full match playback has been blocked.');
      });
    };

    const seekAndPlay = () => {
      const onSeeked = () => {
        clearSeekTimeout();
        verifyAndPlay();
      };

      seekTimeoutRef.current = window.setTimeout(() => {
        if (playRequestRef.current === requestId) {
          failClosed('Clip unavailable. Full match playback has been blocked.');
        }
      }, 4000);

      if (Math.abs(vid.currentTime - clip.clipStart) < 0.05) {
        clearSeekTimeout();
        verifyAndPlay();
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
  }, [clearSeekTimeout, failClosed, startBoundaryEnforcement]);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    const clip = currentClipRef.current;
    if (!vid || !clip) return;

    if (vid.paused) {
      // If at or past clip end, restart from clip start
      if (vid.currentTime >= clip.clipEnd || vid.currentTime < clip.clipStart) {
        vid.currentTime = clip.clipStart;
      }
      vid.play().then(() => {
        setIsPlaying(true);
        startBoundaryEnforcement();
      }).catch(() => {
        failClosed('Clip unavailable. Full match playback has been blocked.');
      });
    } else {
      vid.pause();
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [failClosed, startBoundaryEnforcement]);

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
    clearSeekTimeout();
    setIsPlaying(false);
    setIsClipReady(false);
    setClipError(null);
    setProgress(0);
    currentClipRef.current = null;
    setCurrentClip(null);
  }, [clearSeekTimeout]);

  return useMemo(() => ({
    videoRef,
    isPlaying,
    isClipReady,
    clipError,
    progress,
    currentClip,
    playClip,
    togglePlayPause,
    seekToRatio,
    stop,
  }), [isPlaying, isClipReady, clipError, progress, currentClip, playClip, togglePlayPause, seekToRatio, stop]);
};
