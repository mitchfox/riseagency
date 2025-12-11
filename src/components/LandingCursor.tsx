import { useState, useEffect } from "react";

export const LandingCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[3]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Simple gold dot cursor - no reveal effect */}
      <div className="w-3 h-3 rounded-full bg-primary/80 shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
      <div className="absolute inset-0 w-6 h-6 -translate-x-1.5 -translate-y-1.5 border border-primary/40 rounded-full animate-pulse" />
    </div>
  );
};
