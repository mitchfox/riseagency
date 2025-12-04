import { useState, useEffect, useRef, forwardRef } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  threshold?: number;
  autoPlayOnVisible?: boolean;
}

export const LazyVideo = forwardRef<HTMLVideoElement, LazyVideoProps>(({ 
  src, 
  threshold = 0.1,
  autoPlayOnVisible = false,
  children,
  ...props 
}, ref) => {
  const [isInView, setIsInView] = useState(false);
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

  // Lazy load observer - only load source when in view
  useEffect(() => {
    if (!videoRef.current) return;

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
  }, [threshold, videoRef]);

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

  return (
    <video
      ref={videoRef}
      {...props}
    >
      {isInView && <source src={`${src}#t=0.001`} type="video/mp4" />}
      {children}
    </video>
  );
});
