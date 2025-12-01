import { useState, useEffect } from "react";
import { Player3DEffect } from "./Player3DEffect";

export const LazyPlayer3D = ({ className }: { className?: string }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer loading until after initial render and page is interactive
    const timer = setTimeout(() => {
      // Check if page is idle before loading heavy 3D asset
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => setShouldLoad(true), { timeout: 2000 });
      } else {
        setTimeout(() => setShouldLoad(true), 500);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    return (
      <div className={`absolute inset-0 pointer-events-none ${className}`}>
        {/* Lightweight placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-pulse" />
      </div>
    );
  }

  return <Player3DEffect className={className} />;
};
