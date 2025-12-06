import { useEffect, useState } from 'react';

interface ShootingStarProps {
  className?: string;
}

export const ShootingStar = ({ className = '' }: ShootingStarProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: 0 });

  useEffect(() => {
    // Animation timing: 2 seconds animation, then 10 seconds pause (12 second total cycle)
    const ANIMATION_DURATION = 2000; // 2 seconds (half speed)
    const PAUSE_DURATION = 10000; // 10 seconds
    const TOTAL_CYCLE = ANIMATION_DURATION + PAUSE_DURATION;
    
    let animationFrame: number;
    let startTime: number;
    
    const runAnimation = () => {
      startTime = performance.now();
      setIsAnimating(true);
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        
        // Ease in-out for smooth motion
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Arc from bottom-left (225°) to top-right (45°) - counterclockwise through top
        // 225° -> 180° -> 135° -> 90° -> 45° (180° arc through the top)
        const startAngle = Math.PI * 1.25;  // 225° (bottom-left)
        const endAngle = Math.PI * 0.25;    // 45° (top-right)
        // Going counterclockwise means decreasing angle
        const currentAngle = startAngle - (startAngle - endAngle) * easedProgress;
        
        // Ellipse centered on screen with large radius
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const radiusX = window.innerWidth * 0.6;
        const radiusY = window.innerHeight * 0.5;
        
        const x = centerX + Math.cos(currentAngle) * radiusX;
        const y = centerY - Math.sin(currentAngle) * radiusY; // Negative because screen Y is inverted
        
        setPosition({ x, y });
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    // Initial delay before first animation
    const initialDelay = setTimeout(() => {
      runAnimation();
    }, 2000);
    
    // Set up recurring animation
    const interval = setInterval(() => {
      runAnimation();
    }, TOTAL_CYCLE);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  if (!isAnimating) return null;

  // RiseGold color: rgb(235, 199, 115) / #ebc773 / hsl(43, 73%, 69%)
  const riseGold = '#ebc773';
  const riseGoldLight = '#f5dca0';

  return (
    <div 
      className={`fixed pointer-events-none z-[100] ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Star core - bright white center with gold glow */}
      <div 
        className="absolute rounded-full"
        style={{
          width: '6px',
          height: '6px',
          background: `radial-gradient(circle, #ffffff 0%, ${riseGoldLight} 40%, ${riseGold} 100%)`,
          boxShadow: `
            0 0 4px 2px #ffffffcc,
            0 0 10px 5px ${riseGoldLight}aa,
            0 0 20px 10px ${riseGold}66,
            0 0 40px 20px ${riseGold}22
          `,
        }}
      />
      {/* Main trail - elegant taper */}
      <div 
        className="absolute"
        style={{
          width: '120px',
          height: '2px',
          left: '-115px',
          top: '2px',
          background: `linear-gradient(to right, transparent 0%, ${riseGold}11 20%, ${riseGold}55 50%, ${riseGoldLight}cc 85%, #ffffff 100%)`,
          borderRadius: '1px',
          filter: 'blur(0.5px)',
          transform: 'rotate(-45deg)',
          transformOrigin: 'right center',
        }}
      />
      {/* Secondary glow trail */}
      <div 
        className="absolute"
        style={{
          width: '80px',
          height: '6px',
          left: '-75px',
          top: '0px',
          background: `linear-gradient(to right, transparent 0%, ${riseGold}08 30%, ${riseGold}22 70%, ${riseGold}44 100%)`,
          borderRadius: '3px',
          filter: 'blur(3px)',
          transform: 'rotate(-45deg)',
          transformOrigin: 'right center',
        }}
      />
    </div>
  );
};
