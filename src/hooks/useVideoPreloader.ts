import { useEffect, useRef, useCallback } from 'react';

interface UseVideoPreloaderOptions {
  videos: string[];
  preloadCount?: number;
  enabled?: boolean;
}

export function useVideoPreloader({
  videos,
  preloadCount = 3,
  enabled = true
}: UseVideoPreloaderOptions) {
  const preloadedRef = useRef<Set<string>>(new Set());

  const preloadVideo = useCallback((url: string) => {
    if (!enabled || !url || preloadedRef.current.has(url)) return;
    preloadedRef.current.add(url);

    // Use a hidden video element to actually buffer the media data
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = url;
    video.load();
  }, [enabled]);

  const preloadNextVideos = useCallback((currentIndex: number) => {
    if (!enabled || videos.length === 0) return;
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < videos.length) {
        preloadVideo(videos[nextIndex]);
      }
    }
  }, [videos, preloadCount, enabled, preloadVideo]);

  // Preload first few videos on mount
  useEffect(() => {
    if (!enabled || videos.length === 0) return;
    const timer = setTimeout(() => {
      for (let i = 1; i <= Math.min(preloadCount, videos.length - 1); i++) {
        preloadVideo(videos[i]);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [videos, preloadCount, enabled, preloadVideo]);

  const isPreloaded = useCallback((url: string) => {
    return preloadedRef.current.has(url);
  }, []);

  return {
    preloadNextVideos,
    isPreloaded,
    preloadVideo
  };
}
