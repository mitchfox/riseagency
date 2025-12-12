import { Suspense, useState, useEffect } from "react";
import { Player3DEffect } from "./Player3DEffect";

// Static placeholder while 3D loads - now shows the actual base image
const StaticPlaceholder = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center`}>
    <img 
      src="/assets/player-base.png" 
      alt=""
      className="w-full h-full object-contain"
      loading="eager"
    />
  </div>
);

export const LazyPlayer3D = ({ className }: { className?: string }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Start loading immediately - no delays
    setIsReady(true);
  }, []);

  return (
    <div className={className}>
      {isReady ? (
        <Suspense fallback={<StaticPlaceholder className={className} />}>
          <Player3DEffect className={className} />
        </Suspense>
      ) : (
        <StaticPlaceholder className={className} />
      )}
    </div>
  );
};
