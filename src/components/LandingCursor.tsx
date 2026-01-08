import { useEffect, useRef } from "react";

export const LandingCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const pulse = pulseRef.current;
    if (!cursor || !pulse) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Direct DOM manipulation - no React re-renders
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      
      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        cursor.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      cursor.style.opacity = '0';
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed pointer-events-none z-[3] opacity-0"
      style={{
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 0.15s ease-out',
      }}
    >
      {/* Simple gold dot cursor */}
      <div className="w-3 h-3 rounded-full bg-primary/80 shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
      <div 
        ref={pulseRef}
        className="absolute inset-0 w-6 h-6 -translate-x-1.5 -translate-y-1.5 border border-primary/40 rounded-full animate-pulse" 
      />
    </div>
  );
};
