import { useXRay } from "@/contexts/XRayContext";

export const LightConeBackground = () => {
  const { xrayState } = useXRay();
  
  // Calculate visibility based on x-ray intensity
  const xrayOpacity = xrayState.isActive ? xrayState.intensity : 0;
  
  // Create radial mask centered on x-ray position (only for top cone)
  const maskX = xrayState.position.x * 100;
  const maskY = xrayState.position.y * 100;
  const topConeMaskStyle = xrayOpacity > 0 ? {
    WebkitMaskImage: `radial-gradient(circle 400px at ${maskX}% ${100 - maskY}%, black 0%, transparent 100%)`,
    maskImage: `radial-gradient(circle 400px at ${maskX}% ${100 - maskY}%, black 0%, transparent 100%)`,
  } : {};

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
      {/* Bottom cone - ALWAYS VISIBLE - aligned with menu cone */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ opacity: 0.5 }}
      >
        <defs>
          {/* Gradient for past cone (bottom) */}
          <linearGradient id="pastConeGradientAlways" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Past Light Cone (bottom) - matches menu triangle position */}
        {/* Point at center (50, 50), expands to full width at bottom */}
        <path 
          d="M 50,50 L 100,100 Q 75,102 50,102 Q 25,102 0,100 Z"
          fill="url(#pastConeGradientAlways)"
          opacity="0.5"
        />
        {/* Cone edge lines */}
        <line 
          x1="50" y1="50" 
          x2="0" y2="100"
          stroke="hsl(var(--primary))"
          strokeWidth="0.3"
          opacity="0.4"
        />
        <line 
          x1="50" y1="50" 
          x2="100" y2="100"
          stroke="hsl(var(--primary))"
          strokeWidth="0.3"
          opacity="0.4"
        />
        {/* Bottom ellipse for 3D effect */}
        <ellipse 
          cx="50" 
          cy="101" 
          rx="50" 
          ry="3"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.2"
          opacity="0.3"
        />
        
        {/* Center point hint */}
        <circle 
          cx="50" 
          cy="50" 
          r="1"
          fill="hsl(var(--primary))"
          opacity="0.5"
        />
        
        {/* Partial x-axis visible at center */}
        <line 
          x1="42" y1="50" 
          x2="58" y2="50"
          stroke="hsl(var(--primary))"
          strokeWidth="0.15"
          opacity="0.3"
        />
      </svg>

      {/* Top cone and full axes - ONLY VISIBLE WITH X-RAY */}
      {xrayOpacity > 0 && (
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ 
            opacity: xrayOpacity * 0.7,
            ...topConeMaskStyle
          }}
        >
          <defs>
            {/* Gradient for future cone (top) */}
            <linearGradient id="futureConeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="coneGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Future Light Cone (top) - mirrors the bottom cone */}
          <path 
            d="M 50,50 L 100,0 Q 75,-2 50,-2 Q 25,-2 0,0 Z"
            fill="url(#futureConeGradient)"
            opacity="0.5"
          />
          {/* Cone edge lines */}
          <line 
            x1="50" y1="50" 
            x2="0" y2="0"
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
            opacity="0.6"
          />
          <line 
            x1="50" y1="50" 
            x2="100" y2="0"
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
            opacity="0.6"
          />
          {/* Top ellipse for 3D effect */}
          <ellipse 
            cx="50" 
            cy="-1" 
            rx="50" 
            ry="3"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.2"
            opacity="0.4"
          />
          
          {/* X-axis (horizontal) - full width */}
          <line 
            x1="5" y1="50" 
            x2="95" y2="50"
            stroke="hsl(var(--primary))"
            strokeWidth="0.25"
            opacity="0.8"
            filter="url(#coneGlow)"
          />
          <text x="96" y="51" fill="hsl(var(--primary))" fontSize="3" opacity="0.8" fontFamily="monospace">x</text>
          
          {/* Y-axis (depth - diagonal) */}
          <line 
            x1="35" y1="58" 
            x2="65" y2="42"
            stroke="hsl(48, 96%, 53%)"
            strokeWidth="0.2"
            opacity="0.6"
          />
          <text x="66" y="41" fill="hsl(48, 96%, 53%)" fontSize="3" opacity="0.7" fontFamily="monospace">y</text>
          
          {/* Z-axis (depth - other diagonal) */}
          <line 
            x1="35" y1="42" 
            x2="65" y2="58"
            stroke="hsl(142, 76%, 50%)"
            strokeWidth="0.2"
            opacity="0.6"
          />
          <text x="66" y="59" fill="hsl(142, 76%, 50%)" fontSize="3" opacity="0.7" fontFamily="monospace">z</text>
          
          {/* Time axis (vertical through cones) */}
          <line 
            x1="50" y1="0" 
            x2="50" y2="100"
            stroke="white"
            strokeWidth="0.15"
            opacity="0.4"
            strokeDasharray="2,2"
          />
          <text x="51" y="4" fill="white" fontSize="2.5" opacity="0.6" fontFamily="monospace">time</text>
          
          {/* Center point glow */}
          <circle 
            cx="50" 
            cy="50" 
            r="2"
            fill="hsl(var(--primary))"
            opacity="0.9"
            filter="url(#coneGlow)"
          />
          <circle 
            cx="50" 
            cy="50" 
            r="1"
            fill="white"
            opacity="0.9"
          />
          
          {/* Coordinate plane hint at center */}
          <rect 
            x="40" y="45" 
            width="20" height="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            opacity="0.25"
            transform="rotate(-10, 50, 50)"
          />
          
          {/* Labels */}
          <text x="8" y="8" fill="white" fontSize="2.5" opacity="0.5" fontFamily="monospace">future light cone</text>
          <text x="8" y="94" fill="white" fontSize="2.5" opacity="0.5" fontFamily="monospace">past light cone</text>
        </svg>
      )}
    </div>
  );
};
