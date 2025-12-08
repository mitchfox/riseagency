import { useState, useEffect } from "react";

interface CoordinateOverlayProps {
  enabled?: boolean;
}

export const CoordinateOverlay = ({ enabled = true }: CoordinateOverlayProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      setMousePos({ x: e.clientX, y: e.clientY });
      setCenterOffset({
        x: Math.round(e.clientX - centerX),
        y: Math.round(e.clientY - centerY)
      });
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle with 'G' key (for Grid)
      if (e.key === 'g' || e.key === 'G') {
        setIsVisible(prev => !prev);
      }
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('resize', updateWindowSize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled]);

  if (!enabled || !isVisible) return null;

  const centerX = windowSize.width / 2;
  const centerY = windowSize.height / 2;

  // Grid lines every 100px from center
  const gridLines = [];
  for (let i = -10; i <= 10; i++) {
    if (i === 0) continue;
    // Vertical lines
    gridLines.push(
      <div
        key={`v${i}`}
        className="absolute top-0 bottom-0 w-px bg-primary/10"
        style={{ left: centerX + i * 100 }}
      >
        <span className="absolute top-2 left-1 text-[10px] text-primary/40 font-mono">
          x:{i * 100}
        </span>
      </div>
    );
    // Horizontal lines
    gridLines.push(
      <div
        key={`h${i}`}
        className="absolute left-0 right-0 h-px bg-primary/10"
        style={{ top: centerY + i * 100 }}
      >
        <span className="absolute left-2 top-1 text-[10px] text-primary/40 font-mono">
          y:{i * 100}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Grid lines */}
      {gridLines}

      {/* Center crosshair */}
      <div
        className="absolute w-6 h-px bg-primary/60"
        style={{ left: centerX - 12, top: centerY }}
      />
      <div
        className="absolute h-6 w-px bg-primary/60"
        style={{ left: centerX, top: centerY - 12 }}
      />
      <div
        className="absolute w-2 h-2 rounded-full bg-primary/80 border border-primary"
        style={{ left: centerX - 4, top: centerY - 4 }}
      />

      {/* Center label */}
      <div
        className="absolute text-[10px] text-primary/60 font-mono"
        style={{ left: centerX + 8, top: centerY + 8 }}
      >
        (0, 0)
      </div>

      {/* Mouse position indicator */}
      <div
        className="absolute w-4 h-4 border border-primary/80 rounded-full"
        style={{ 
          left: mousePos.x - 8, 
          top: mousePos.y - 8,
          boxShadow: '0 0 10px hsl(var(--primary) / 0.3)'
        }}
      />

      {/* Coordinate display panel */}
      <div className="absolute top-4 left-4 bg-black/80 border border-primary/30 rounded-lg p-3 font-mono text-xs">
        <div className="text-primary/60 mb-2 text-[10px] uppercase tracking-wider">
          Vector System (Press G to toggle)
        </div>
        <div className="space-y-1">
          <div className="flex gap-4">
            <span className="text-white/40">Absolute:</span>
            <span className="text-white/80">
              ({mousePos.x}, {mousePos.y})
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-primary/60">From Center:</span>
            <span className="text-primary font-bold">
              ({centerOffset.x > 0 ? '+' : ''}{centerOffset.x}, {centerOffset.y > 0 ? '+' : ''}{centerOffset.y})
            </span>
          </div>
          <div className="flex gap-4 text-white/30 text-[10px]">
            <span>Screen:</span>
            <span>{windowSize.width} × {windowSize.height}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-primary/20 text-[10px] text-white/40">
          <div>+X = right, -X = left</div>
          <div>+Y = down, -Y = up</div>
        </div>
      </div>

      {/* Quick reference markers at key positions */}
      {[
        { x: 0, y: -200, label: 'top' },
        { x: 0, y: 200, label: 'bottom' },
        { x: -300, y: 0, label: 'left' },
        { x: 300, y: 0, label: 'right' },
      ].map(marker => (
        <div
          key={marker.label}
          className="absolute text-[9px] text-primary/40 font-mono"
          style={{
            left: centerX + marker.x - 20,
            top: centerY + marker.y - 6
          }}
        >
          ({marker.x}, {marker.y})
        </div>
      ))}
    </div>
  );
};
