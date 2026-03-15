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
  const ghostVideosRef = useRef<HTMLVideoElement[]>([]);
  const pauseTimersRef = useRef<number[]>([]);

  const preloadVideo = useCallback((url: string) => {
    if (!enabled || !url || preloadedRef.current.has(url) || typeof document === 'undefined') return;

    // Priority hint for browser-level media fetching
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'video';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    linksRef.current.push(link);

    // Hidden warmup player to force actual buffering, not just DNS/prefetch hints
    const ghostVideo = document.createElement('video');
    ghostVideo.src = url;
    ghostVideo.preload = 'auto';
    ghostVideo.crossOrigin = 'anonymous';
    ghostVideo.muted = true;
    ghostVideo.playsInline = true;
    ghostVideo.setAttribute('muted', 'true');
    ghostVideo.setAttribute('playsinline', 'true');
    ghostVideo.setAttribute('aria-hidden', 'true');
    ghostVideo.style.position = 'absolute';
    ghostVideo.style.width = '1px';
    ghostVideo.style.height = '1px';
    ghostVideo.style.opacity = '0';
    ghostVideo.style.pointerEvents = 'none';

    ghostVideo.addEventListener('canplay', () => {
      const warmup = ghostVideo.play();
      if (warmup && typeof warmup.then === 'function') {
        void warmup
          .then(() => {
            const timer = window.setTimeout(() => {
              ghostVideo.pause();
            }, 1200);
            pauseTimersRef.current.push(timer);
          })
          .catch(() => {});
      }
    }, { once: true });

    document.body.appendChild(ghostVideo);
    ghostVideosRef.current.push(ghostVideo);
    ghostVideo.load();

    preloadedRef.current.add(url);
  }, [enabled]);

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
    }, 1000);

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

      ghostVideosRef.current.forEach(video => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      });

      pauseTimersRef.current.forEach(timer => window.clearTimeout(timer));

      linksRef.current = [];
      ghostVideosRef.current = [];
      pauseTimersRef.current = [];
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
