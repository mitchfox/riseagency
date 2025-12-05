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
  const linksRef = useRef<HTMLLinkElement[]>([]);

  const preloadVideo = useCallback((url: string) => {
    if (!url || preloadedRef.current.has(url)) return;
    
    // Use link prefetch for video preloading
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'video';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    linksRef.current.push(link);
    preloadedRef.current.add(url);
  }, []);

  const preloadNextVideos = useCallback((currentIndex: number) => {
    if (!enabled || videos.length === 0) return;

    // Preload next N videos after current
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

    // Preload videos 1 to preloadCount (skip 0 as it loads immediately)
    const timer = setTimeout(() => {
      for (let i = 1; i <= Math.min(preloadCount, videos.length - 1); i++) {
        preloadVideo(videos[i]);
      }
    }, 2000); // Start preloading after 2 seconds

    return () => clearTimeout(timer);
  }, [videos, preloadCount, enabled, preloadVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      linksRef.current.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
      linksRef.current = [];
    };
  }, []);

  const isPreloaded = useCallback((url: string) => {
    return preloadedRef.current.has(url);
  }, []);

  return {
    preloadNextVideos,
    isPreloaded,
    preloadVideo
  };
}
