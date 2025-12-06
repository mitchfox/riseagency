import { useEffect, useState } from 'react';

interface ShootingStarProps {
  className?: string;
}

export const ShootingStar = ({ className = '' }: ShootingStarProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: 0 });

  useEffect(() => {
    // Animation timing: 1 second animation, then 11 seconds pause (12 second total cycle)
    const ANIMATION_DURATION = 1000; // 1 second
    const PAUSE_DURATION = 11000; // 11 seconds
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
      {/* Star core - risegold */}
      <div 
        className="absolute rounded-full"
        style={{
          width: '10px',
          height: '10px',
          background: `radial-gradient(circle, ${riseGoldLight} 0%, ${riseGold} 60%, #d4a84b 100%)`,
          boxShadow: `
            0 0 8px 4px ${riseGold}cc,
            0 0 16px 8px ${riseGold}99,
            0 0 32px 16px ${riseGold}44
          `,
        }}
      />
      {/* Trail - risegold gradient */}
      <div 
        className="absolute"
        style={{
          width: '80px',
          height: '4px',
          left: '-75px',
          top: '3px',
          background: `linear-gradient(to right, transparent 0%, ${riseGold}33 30%, ${riseGold}aa 70%, ${riseGoldLight} 100%)`,
          borderRadius: '2px',
          filter: 'blur(1px)',
          transform: 'rotate(-45deg)',
          transformOrigin: 'right center',
        }}
      />
    </div>
  );
};
