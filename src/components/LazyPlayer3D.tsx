import { lazy, Suspense, useState, useEffect } from "react";

// Lazy load the heavy 3D component
const Player3DEffect = lazy(() => 
  import("./Player3DEffect").then(module => ({ default: module.Player3DEffect }))
);

export const LazyPlayer3D = ({ className }: { className?: string }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer loading until the browser is idle to improve First Input Delay
    // This ensures the page becomes interactive before loading the heavy 3D effect
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShouldLoad(true), { timeout: 1000 });
      return () => cancelIdleCallback(id);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timeout);
    }
  }, []);

  if (!shouldLoad) {
    // Return empty placeholder while waiting for idle time
    return <div className={className} />;
  }

  return (
    <Suspense fallback={<div className={className} />}>
      <Player3DEffect className={className} />
    </Suspense>
  );
};
