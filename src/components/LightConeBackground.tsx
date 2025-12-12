import { useXRay } from "@/contexts/XRayContext";

export const LightConeBackground = () => {
  const { xrayState } = useXRay();
  
  // X-ray cursor bubble mask - only reveal within cursor radius
  const xrayOpacity = xrayState.isActive ? xrayState.intensity : 0;
  const cursorX = xrayState.position.x * 100;
  const cursorY = xrayState.position.y * 100;
  const bubbleRadius = 15; // Percentage of screen

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[8]">
      {/* Bottom cone - ALWAYS VISIBLE - aligned with menu cone */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ opacity: 0.6 }}
      >
        <defs>
          {/* Gradient for past cone (bottom) */}
          <linearGradient id="pastConeGradientAlways" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        
        {/* Past Light Cone (bottom) - apex centered */}
        <path 
          d="M 50,65 L 100,100 Q 75,102 50,102 Q 25,102 0,100 Z"
          fill="url(#pastConeGradientAlways)"
          opacity="0.6"
        />
        {/* Cone edge lines */}
        <line 
          x1="50" y1="65" 
          x2="0" y2="100"
          stroke="hsl(var(--primary))"
          strokeWidth="0.3"
          opacity="0.5"
        />
        <line 
          x1="50" y1="65" 
          x2="100" y2="100"
          stroke="hsl(var(--primary))"
          strokeWidth="0.3"
          opacity="0.5"
        />
        {/* Bottom ellipse for 3D effect */}
        <ellipse 
          cx="50" 
          cy="101" 
          rx="50" 
          ry="3"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.25"
          opacity="0.4"
        />
        
      </svg>

      {/* Top cone and full axes with planes - REVEALED BY CURSOR BUBBLE MASK */}
      {xrayOpacity > 0 && (
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ 
            opacity: xrayOpacity * 0.9
          }}
        >
          <defs>
            {/* Cursor bubble radial mask - reveals only within cursor radius */}
            <radialGradient id="cursorBubbleMask" cx={`${cursorX}%`} cy={`${cursorY}%`} r={`${bubbleRadius}%`}>
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="70%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="xrayBubbleMask">
              <rect x="0" y="0" width="100" height="100" fill="url(#cursorBubbleMask)" />
            </mask>
            
            {/* Gradient for future cone (top) */}
            <linearGradient id="futureConeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
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
          
          {/* Apply cursor bubble mask to all x-ray content */}
          <g mask="url(#xrayBubbleMask)">
          
          {/* Future Light Cone (top) - mirrors the bottom cone */}
          <path 
            d="M 50,50 L 100,0 Q 75,-2 50,-2 Q 25,-2 0,0 Z"
            fill="url(#futureConeGradient)"
            opacity="0.6"
          />
          {/* Cone edge lines */}
          <line 
            x1="50" y1="50" 
            x2="0" y2="0"
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
            opacity="0.7"
          />
          <line 
            x1="50" y1="50" 
            x2="100" y2="0"
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
            opacity="0.7"
          />
          {/* Top ellipse for 3D effect */}
          <ellipse 
            cx="50" 
            cy="-1" 
            rx="50" 
            ry="3"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.25"
            opacity="0.5"
          />
          
          {/* ===== 3D AXIS PLANES - Proper isometric perspective ===== */}
          
          {/* XY Plane - Horizontal plane at origin, viewed from above at angle */}
          {/* Forms a diamond/rhombus shape in isometric view */}
          <polygon 
            points="50,42 75,50 50,58 25,50"
            fill="hsl(var(--primary))"
            opacity="0.25"
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
          />
          
          {/* XZ Plane - Vertical plane facing viewer (front wall) */}
          {/* Green-tinted, stands upright */}
          <polygon 
            points="25,50 50,42 50,25 25,33"
            fill="hsl(142, 76%, 50%)"
            opacity="0.2"
            stroke="hsl(142, 76%, 50%)"
            strokeWidth="0.3"
          />
          
          {/* YZ Plane - Vertical plane perpendicular to viewer (side wall) */}
          {/* Yellow-tinted, goes into depth */}
          <polygon 
            points="50,42 75,50 75,33 50,25"
            fill="hsl(48, 96%, 53%)"
            opacity="0.2"
            stroke="hsl(48, 96%, 53%)"
            strokeWidth="0.3"
          />
          
          {/* ===== AXES ===== */}
          
          {/* X-axis - goes left from origin (isometric left) */}
          <line 
            x1="50" y1="50" 
            x2="10" y2="66"
            stroke="hsl(var(--primary))"
            strokeWidth="0.4"
            opacity="0.9"
            filter="url(#coneGlow)"
          />
          <text x="6" y="70" fill="hsl(var(--primary))" fontSize="3" opacity="0.9" fontFamily="monospace" fontWeight="bold">x</text>
          
          {/* Y-axis - goes up from origin (vertical) */}
          <line 
            x1="50" y1="50" 
            x2="50" y2="15"
            stroke="hsl(48, 96%, 53%)"
            strokeWidth="0.4"
            opacity="0.9"
          />
          <text x="52" y="12" fill="hsl(48, 96%, 53%)" fontSize="3" opacity="0.9" fontFamily="monospace" fontWeight="bold">y</text>
          
          {/* Z-axis - goes right from origin (isometric right/depth) */}
          <line 
            x1="50" y1="50" 
            x2="90" y2="66"
            stroke="hsl(142, 76%, 50%)"
            strokeWidth="0.4"
            opacity="0.9"
          />
          <text x="92" y="70" fill="hsl(142, 76%, 50%)" fontSize="3" opacity="0.9" fontFamily="monospace" fontWeight="bold">z</text>
          
          {/* Time axis (vertical through cones - dashed) */}
          <line 
            x1="50" y1="0" 
            x2="50" y2="100"
            stroke="white"
            strokeWidth="0.2"
            opacity="0.5"
            strokeDasharray="2,2"
          />
          <text x="52" y="4" fill="white" fontSize="2.5" opacity="0.7" fontFamily="monospace">time</text>
          
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
          </g>
        </svg>
      )}
    </div>
  );
};
