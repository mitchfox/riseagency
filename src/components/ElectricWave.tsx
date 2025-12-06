import { useEffect, useRef } from 'react';

export const ElectricWave = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Resize canvas to window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Wave state
    const WAVE_INTERVAL = 10000; // 10 seconds
    const WAVE_DURATION = 1200; // 1.2 seconds for wave to cross
    let lastWaveTime = Date.now() - WAVE_INTERVAL + 2000; // First wave after 2s
    let waveActive = false;
    let waveStartTime = 0;
    let waveCorner = 0; // 0: top-left, 1: top-right, 2: bottom-right, 3: bottom-left
    
    // RiseGold colors
    const riseGold = { r: 235, g: 199, b: 115 };
    const white = { r: 255, g: 255, b: 255 };
    const grey = { r: 180, g: 180, b: 180 };
    
    const animate = () => {
      const currentTime = Date.now();
      const timeSinceWave = currentTime - lastWaveTime;
      
      // Start new wave
      if (!waveActive && timeSinceWave >= WAVE_INTERVAL) {
        waveActive = true;
        waveStartTime = currentTime;
        waveCorner = Math.floor(Math.random() * 4);
        lastWaveTime = currentTime;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (waveActive) {
        const elapsed = currentTime - waveStartTime;
        const progress = Math.min(elapsed / WAVE_DURATION, 1);
        
        // Ease in-out
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        const w = canvas.width;
        const h = canvas.height;
        const diagonal = Math.sqrt(w * w + h * h);
        
        // Calculate start and end corners
        let startX: number, startY: number, endX: number, endY: number;
        
        switch (waveCorner) {
          case 0: // top-left to bottom-right
            startX = 0; startY = 0;
            endX = w; endY = h;
            break;
          case 1: // top-right to bottom-left
            startX = w; startY = 0;
            endX = 0; endY = h;
            break;
          case 2: // bottom-right to top-left
            startX = w; startY = h;
            endX = 0; endY = 0;
            break;
          case 3: // bottom-left to top-right
          default:
            startX = 0; startY = h;
            endX = w; endY = 0;
            break;
        }
        
        // Wave position along diagonal
        const waveRadius = eased * diagonal * 1.5;
        const waveWidth = diagonal * 0.15; // Width of the wave band
        
        // Draw electric wave effect
        ctx.save();
        
        // Create multiple layers for electric effect
        for (let layer = 0; layer < 5; layer++) {
          const layerOffset = (layer - 2) * (waveWidth * 0.15);
          const currentRadius = waveRadius + layerOffset;
          
          // Create gradient for this layer
          const gradient = ctx.createRadialGradient(
            startX, startY, Math.max(0, currentRadius - waveWidth),
            startX, startY, currentRadius + waveWidth * 0.5
          );
          
          // Layer-specific colors and opacity
          let alpha: number;
          let color: { r: number; g: number; b: number };
          
          if (layer === 0 || layer === 4) {
            // Outer grey/white trim
            color = grey;
            alpha = 0.3;
          } else if (layer === 1 || layer === 3) {
            // White edge
            color = white;
            alpha = 0.5;
          } else {
            // Center risegold
            color = riseGold;
            alpha = 0.7;
          }
          
          // Fade based on progress (fade in at start, fade out at end)
          let fadeMult = 1;
          if (progress < 0.1) {
            fadeMult = progress / 0.1;
          } else if (progress > 0.7) {
            fadeMult = 1 - (progress - 0.7) / 0.3;
          }
          alpha *= fadeMult;
          
          gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
          gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
          gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
          gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
        }
        
        // Calculate fade for crackles
        let crackleFade = 1;
        if (progress < 0.1) {
          crackleFade = progress / 0.1;
        } else if (progress > 0.7) {
          crackleFade = 1 - (progress - 0.7) / 0.3;
        }
        
        // Add electric crackle lines
        const numCrackles = 8;
        const crackleAngle = Math.atan2(endY - startY, endX - startX);
        
        for (let i = 0; i < numCrackles; i++) {
          const angleOffset = (i / numCrackles - 0.5) * Math.PI * 0.8;
          const angle = crackleAngle + angleOffset;
          
          // Position along the wave front
          const baseX = startX + Math.cos(crackleAngle) * waveRadius;
          const baseY = startY + Math.sin(crackleAngle) * waveRadius;
          
          // Offset perpendicular to wave direction
          const perpX = Math.cos(crackleAngle + Math.PI / 2) * (i - numCrackles / 2) * 50;
          const perpY = Math.sin(crackleAngle + Math.PI / 2) * (i - numCrackles / 2) * 50;
          
          ctx.beginPath();
          ctx.moveTo(baseX + perpX, baseY + perpY);
          
          // Jagged lightning path
          const segments = 5;
          const segmentLength = 30 + Math.random() * 40;
          let x = baseX + perpX;
          let y = baseY + perpY;
          
          for (let s = 0; s < segments; s++) {
            const jitter = (Math.random() - 0.5) * 30;
            x += Math.cos(angle) * segmentLength + jitter;
            y += Math.sin(angle) * segmentLength + jitter * 0.5;
            ctx.lineTo(x, y);
          }
          
          // Fade crackles
          const crackleAlpha = crackleFade * 0.6 * (0.5 + Math.random() * 0.5);
          ctx.strokeStyle = `rgba(${riseGold.r}, ${riseGold.g}, ${riseGold.b}, ${crackleAlpha})`;
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.stroke();
          
          // White glow on some crackles
          if (Math.random() > 0.5) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${crackleAlpha * 0.5})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        
        ctx.restore();
        
        if (progress >= 1) {
          waveActive = false;
        }
      }
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
