import { useXRay } from "@/contexts/XRayContext";

export const LightConeBackground = () => {
  const { xrayState } = useXRay();
  
  // Calculate visibility based on x-ray intensity
  const xrayOpacity = xrayState.isActive ? xrayState.intensity : 0;
  
  // Create radial mask centered on x-ray position
  const maskX = xrayState.position.x * 100;
  const maskY = xrayState.position.y * 100;
  const maskStyle = xrayOpacity > 0 ? {
    WebkitMaskImage: `radial-gradient(circle 300px at ${maskX}% ${100 - maskY}%, black 0%, transparent 100%)`,
    maskImage: `radial-gradient(circle 300px at ${maskX}% ${100 - maskY}%, black 0%, transparent 100%)`,
  } : {};

  if (xrayOpacity === 0) return null;

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-[2]"
      style={{ 
        opacity: xrayOpacity * 0.8,
        ...maskStyle
      }}
    >
      {/* Light Cone SVG - Two cones meeting at center with xyz axes */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for future cone (top) */}
          <linearGradient id="futureConeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
          
          {/* Gradient for past cone (bottom) */}
          <linearGradient id="pastConeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="coneGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Center point - where cones meet (representing "now") */}
        <g transform="translate(50, 50)">
          {/* Future Light Cone (top) - pointing up */}
          <ellipse 
            cx="0" 
            cy="-35" 
            rx="18" 
            ry="4"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.2"
            opacity="0.6"
          />
          <line 
            x1="0" y1="0" 
            x2="-18" y2="-35"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.8"
          />
          <line 
            x1="0" y1="0" 
            x2="18" y2="-35"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.8"
          />
          {/* Future cone fill */}
          <path 
            d="M 0,0 L -18,-35 A 18 4 0 0 1 18,-35 Z"
            fill="url(#futureConeGradient)"
            opacity="0.3"
          />
          
          {/* Past Light Cone (bottom) - pointing down */}
          <ellipse 
            cx="0" 
            cy="35" 
            rx="18" 
            ry="4"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.2"
            opacity="0.6"
          />
          <line 
            x1="0" y1="0" 
            x2="-18" y2="35"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.8"
          />
          <line 
            x1="0" y1="0" 
            x2="18" y2="35"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.8"
          />
          {/* Past cone fill */}
          <path 
            d="M 0,0 L -18,35 A 18 4 0 0 0 18,35 Z"
            fill="url(#pastConeGradient)"
            opacity="0.3"
          />
          
          {/* X-axis (horizontal) */}
          <line 
            x1="-25" y1="0" 
            x2="25" y2="0"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.9"
            filter="url(#coneGlow)"
          />
          <text x="26" y="1" fill="hsl(var(--primary))" fontSize="3" opacity="0.8" fontFamily="monospace">x</text>
          
          {/* Y-axis (vertical going into depth - shown as diagonal) */}
          <line 
            x1="0" y1="8" 
            x2="0" y2="-8"
            stroke="hsl(48, 96%, 53%)"
            strokeWidth="0.15"
            opacity="0.7"
          />
          <text x="1" y="-9" fill="hsl(48, 96%, 53%)" fontSize="3" opacity="0.8" fontFamily="monospace">y</text>
          
          {/* Z-axis (depth - shown as diagonal) */}
          <line 
            x1="-12" y1="6" 
            x2="12" y2="-6"
            stroke="hsl(142, 76%, 50%)"
            strokeWidth="0.15"
            opacity="0.7"
          />
          <text x="13" y="-7" fill="hsl(142, 76%, 50%)" fontSize="3" opacity="0.8" fontFamily="monospace">z</text>
          
          {/* Time axis (vertical through cones) */}
          <line 
            x1="0" y1="-40" 
            x2="0" y2="40"
            stroke="white"
            strokeWidth="0.1"
            opacity="0.5"
            strokeDasharray="1,1"
          />
          <text x="1" y="-41" fill="white" fontSize="2.5" opacity="0.7" fontFamily="monospace">time</text>
          
          {/* Center point glow */}
          <circle 
            cx="0" 
            cy="0" 
            r="1.5"
            fill="hsl(var(--primary))"
            opacity="0.9"
            filter="url(#coneGlow)"
          />
          <circle 
            cx="0" 
            cy="0" 
            r="0.8"
            fill="white"
            opacity="0.9"
          />
          
          {/* Coordinate plane hints (square at center) */}
          <rect 
            x="-10" y="-5" 
            width="20" height="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.1"
            opacity="0.3"
            transform="rotate(-15)"
          />
          
          {/* Labels */}
          <text x="-8" y="-28" fill="white" fontSize="2" opacity="0.5" fontFamily="monospace">future light cone</text>
          <text x="-6" y="30" fill="white" fontSize="2" opacity="0.5" fontFamily="monospace">past light cone</text>
        </g>
      </svg>
    </div>
  );
};
