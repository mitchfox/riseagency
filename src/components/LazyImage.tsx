import { useState, useEffect, useRef, memo } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  threshold?: number;
  disableLoadingTransition?: boolean;
  priority?: boolean;
  responsiveSizes?: string;
}

// Generate srcSet for Supabase storage images
const generateSrcSet = (src: string): string | undefined => {
  // Only generate srcSet for Supabase storage URLs
  if (!src || !src.includes('supabase') || !src.includes('/storage/')) return undefined;
  
  const widths = [320, 640, 960, 1280];
  return widths
    .map(w => `${src}?width=${w}&resize=contain ${w}w`)
    .join(', ');
};

export const LazyImage = memo(({ 
  src, 
  alt, 
  threshold = 0.1, 
  disableLoadingTransition = false,
  priority = false,
  responsiveSizes,
  className,
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold, priority]);

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      srcSet={isInView ? generateSrcSet(src) : undefined}
      sizes={responsiveSizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      style={disableLoadingTransition ? undefined : {
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
      {...props}
    />
  );
});
