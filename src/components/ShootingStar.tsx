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
        
        // Ease in-out
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // 90° arc from 270° to 360° (left to right, bottom arc)
        const startAngle = Math.PI * 1.5;  // 270° (left)
        const endAngle = Math.PI * 2;      // 360° (right)
        const currentAngle = startAngle + (endAngle - startAngle) * easedProgress;
        
        // Ellipse centered on screen with large radius to go off-screen
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight * 0.45; // Slightly above center
        const radiusX = window.innerWidth * 0.65;  // Wide enough to start/end off-screen
        const radiusY = window.innerHeight * 0.4;
        
        const x = centerX + Math.cos(currentAngle) * radiusX;
        const y = centerY + Math.sin(currentAngle) * radiusY;
        
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

  return (
    <div 
      className={`fixed pointer-events-none z-[100] ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Star core */}
      <div 
        className="absolute rounded-full"
        style={{
          width: '8px',
          height: '8px',
          background: 'radial-gradient(circle, #fff 0%, #ffe066 50%, #d4a84b 100%)',
          boxShadow: `
            0 0 10px 5px rgba(255, 230, 102, 0.8),
            0 0 20px 10px rgba(212, 168, 75, 0.6),
            0 0 40px 20px rgba(212, 168, 75, 0.3)
          `,
        }}
      />
      {/* Trail */}
      <div 
        className="absolute"
        style={{
          width: '60px',
          height: '3px',
          left: '-60px',
          top: '2.5px',
          background: 'linear-gradient(to right, transparent 0%, rgba(212, 168, 75, 0.3) 30%, rgba(255, 230, 102, 0.8) 100%)',
          borderRadius: '2px',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
};
