import { useState, useEffect, useRef, forwardRef } from "react";

interface SequentialLazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  pointIndex: number;
  currentLoadingPoint: number;
  onVideoLoaded?: () => void;
}

/**
 * Video component that loads sequentially based on point index.
 * Only loads when currentLoadingPoint >= pointIndex.
 */
export const SequentialLazyVideo = forwardRef<HTMLVideoElement, SequentialLazyVideoProps>(({ 
  src, 
  pointIndex,
  currentLoadingPoint,
  onVideoLoaded,
  children,
  ...props 
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldLoad = currentLoadingPoint >= pointIndex;
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

  const handleCanPlay = () => {
    if (!isLoaded) {
      setIsLoaded(true);
      onVideoLoaded?.();
    }
  };

  return (
    <video
      ref={videoRef}
      {...props}
      onCanPlay={handleCanPlay}
    >
      {shouldLoad && <source src={`${src}#t=0.001`} type="video/mp4" />}
      {children}
    </video>
  );
});

SequentialLazyVideo.displayName = "SequentialLazyVideo";
