import { useEffect, useRef } from 'react';

interface HeroVideoPlayerProps {
  videoUrl: string;
  className?: string;
}

export const HeroVideoPlayer = ({ videoUrl, className = '' }: HeroVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video plays on load
    video.play().catch(() => {
      // Autoplay was prevented, that's ok
    });
  }, [videoUrl]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div className="relative w-full" style={{ aspectRatio: '21/9' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        {/* Subtle gradient overlay for text readability if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-background/30 pointer-events-none" />
      </div>
    </div>
  );
};
