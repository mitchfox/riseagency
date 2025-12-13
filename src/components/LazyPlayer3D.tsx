import { Suspense, useState, useEffect } from "react";
import { Player3DEffect } from "./Player3DEffect";

interface LazyPlayer3DProps {
  className?: string;
  imagePrefix?: string; // e.g., "player" or "player2" for different image sets
}

// Static placeholder while 3D loads - now shows the actual base image
const StaticPlaceholder = ({ className, imagePrefix = "player" }: { className?: string; imagePrefix?: string }) => (
  <div className={`${className} flex items-center justify-center`}>
    <img 
      src={`/assets/${imagePrefix}-base.png`}
      alt=""
      className="w-full h-full object-contain"
      loading="eager"
    />
  </div>
);

export const LazyPlayer3D = ({ className, imagePrefix = "player" }: LazyPlayer3DProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Start loading immediately - no delays
    setIsReady(true);
  }, []);

  return (
    <div className={className}>
      {isReady ? (
        <Suspense fallback={<StaticPlaceholder className={className} imagePrefix={imagePrefix} />}>
          <Player3DEffect className={className} imagePrefix={imagePrefix} />
        </Suspense>
      ) : (
        <StaticPlaceholder className={className} imagePrefix={imagePrefix} />
      )}
    </div>
  );
};
