import { useState, useEffect, useRef, forwardRef } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  threshold?: number;
  autoPlayOnVisible?: boolean;
  loadImmediately?: boolean;
  onCanPlay?: () => void;
}

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

  // React to loadImmediately changing from false to true after mount
  useEffect(() => {
    if (loadImmediately) {
      setIsInView(true);
    }
  }, [loadImmediately]);

  // Lazy load observer - only load source when in view (skip if loadImmediately)
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
  // Autoplay/pause observer - play when visible, pause when not
  useEffect(() => {
    if (!autoPlayOnVisible || !videoRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play().catch(() => {
            // Autoplay failed, user interaction required
          });
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [autoPlayOnVisible, videoRef, isInView]);

  // Handle canplay event
  const handleCanPlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    onCanPlay?.();
  };

  return (
    <video
      ref={videoRef}
      {...props}
      onCanPlay={handleCanPlay}
    >
      {isInView && <source src={src} type="video/mp4" />}
      {children}
    </video>
  );
});
