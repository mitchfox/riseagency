import { Player3DEffect } from "./Player3DEffect";

export const LazyPlayer3D = ({ className }: { className?: string }) => {
  // Load immediately - no delays
  return <Player3DEffect className={className} />;
};
