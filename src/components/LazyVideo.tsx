import { useState, useEffect, useRef, forwardRef } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  threshold?: number;
  autoPlayOnVisible?: boolean;
  loadImmediately?: boolean;
  onCanPlay?: () => void;
}

const getMimeType = (url: string): string | undefined => {
  try {
    const pathname = new URL(url, window.location.origin).pathname.toLowerCase();
    if (pathname.endsWith('.webm')) return 'video/webm';
    if (pathname.endsWith('.mp4')) return 'video/mp4';
    if (pathname.endsWith('.ogg')) return 'video/ogg';
  } catch {
    const lower = url.toLowerCase();
    if (lower.includes('.webm')) return 'video/webm';
    if (lower.includes('.mp4')) return 'video/mp4';
  }
  return undefined; // let browser auto-detect
};

export const LazyVideo = forwardRef<HTMLVideoElement, LazyVideoProps>(({ 
  src, 
  threshold = 0.1,
  autoPlayOnVisible = false,
  loadImmediately = false,
  onCanPlay,
  children,
  ...props 
}, ref) => {
  const [isInView, setIsInView] = useState(loadImmediately);
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

  useEffect(() => {
    if (loadImmediately) {
      setIsInView(true);
    }
  }, [loadImmediately]);

  useEffect(() => {
    if (loadImmediately || isInView || !videoRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [threshold, videoRef, loadImmediately, isInView]);

  useEffect(() => {
    if (!autoPlayOnVisible || !videoRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play().catch(() => {});
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [autoPlayOnVisible, videoRef, isInView]);

  const handleCanPlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    onCanPlay?.();
  };

  const mimeType = getMimeType(src);

  return (
    <video
      ref={videoRef}
      {...props}
      onCanPlay={handleCanPlay}
    >
      {isInView && <source src={src} {...(mimeType ? { type: mimeType } : {})} />}
      {children}
    </video>
  );
});
