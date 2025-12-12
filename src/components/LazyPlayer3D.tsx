import { lazy, Suspense, useState, useEffect, useRef } from "react";

// Lazy load the heavy 3D component
const Player3DEffect = lazy(() => 
  import("./Player3DEffect").then(module => ({ default: module.Player3DEffect }))
);

// Static placeholder while 3D loads
const StaticPlaceholder = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center`}>
    <img 
      src="/assets/player-static-fallback.png" 
      alt=""
      className="w-full h-full object-contain opacity-0"
      loading="eager"
    />
  </div>
);

export const LazyPlayer3D = ({ className }: { className?: string }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use IntersectionObserver to only load when visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Load immediately since images are now preloaded and no ZIP parsing needed
    setShouldLoad(true);
  }, [isVisible]);

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <Suspense fallback={<StaticPlaceholder className={className} />}>
          <Player3DEffect className={className} />
        </Suspense>
      ) : (
        <StaticPlaceholder className={className} />
      )}
    </div>
  );
};
