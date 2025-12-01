import { useState, useEffect, useRef, forwardRef } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  threshold?: number;
}

export const LazyVideo = forwardRef<HTMLVideoElement, LazyVideoProps>(({ 
  src, 
  threshold = 0.1,
  children,
  ...props 
}, ref) => {
  const [isInView, setIsInView] = useState(false);
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

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

  return (
    <video
      ref={videoRef}
      {...props}
    >
      {isInView && <source src={src} type="video/mp4" />}
      {children}
    </video>
  );
});
