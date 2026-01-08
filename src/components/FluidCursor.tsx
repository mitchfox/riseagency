import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransition } from '@/contexts/TransitionContext';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Line {
  spring: number;
  friction: number;
  nodes: Node[];
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const FluidCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(true);
  const posRef = useRef({ x: 0, y: 0 });
  const linesRef = useRef<Line[]>([]);
  const frameRef = useRef(0);
  const { isTransitioning } = useTransition();
  const location = useLocation();
  
  // Don't show FluidCursor on landing page - it has its own x-ray cursor effect
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    // Only enable on desktop (non-touch devices with screen width > 768px)
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isMobile || isTouchDevice) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reduced complexity for better performance
    const E = {
      friction: 0.5,
      trails: 10,      // Reduced from 20
      size: 30,        // Reduced from 50
      dampening: 0.25,
      tension: 0.98,
    };
    
    // Idle detection
    let isIdle = false;
    let idleTimeout: number | null = null;
    const IDLE_DELAY = 150; // ms before pausing animation

    const pos = posRef.current;

    class LineClass implements Line {
      spring: number;
      friction: number;
      nodes: Node[];

      constructor(springBase: number) {
        this.spring = springBase + 0.1 * Math.random() - 0.02;
        this.friction = E.friction + 0.01 * Math.random() - 0.002;
        this.nodes = [];
        for (let i = 0; i < E.size; i++) {
          this.nodes.push({ x: pos.x, y: pos.y, vx: 0, vy: 0 });
        }
      }

      update() {
        let spring = this.spring;
        let node = this.nodes[0];
        node.vx += (pos.x - node.x) * spring;
        node.vy += (pos.y - node.y) * spring;

        for (let i = 0; i < this.nodes.length; i++) {
          node = this.nodes[i];
          if (i > 0) {
            const prev = this.nodes[i - 1];
            node.vx += (prev.x - node.x) * spring;
            node.vy += (prev.y - node.y) * spring;
            node.vx += prev.vx * E.dampening;
            node.vy += prev.vy * E.dampening;
          }
          node.vx *= this.friction;
          node.vy *= this.friction;
          node.x += node.vx;
          node.y += node.vy;
          spring *= E.tension;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        let x = this.nodes[0].x;
        let y = this.nodes[0].y;

        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let i = 1; i < this.nodes.length - 2; i++) {
          const curr = this.nodes[i];
          const next = this.nodes[i + 1];
          x = 0.5 * (curr.x + next.x);
          y = 0.5 * (curr.y + next.y);
          ctx.quadraticCurveTo(curr.x, curr.y, x, y);
        }

        const secondLast = this.nodes[this.nodes.length - 2];
        const last = this.nodes[this.nodes.length - 1];
        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
        ctx.stroke();
        ctx.closePath();
      }
    }

    const initLines = () => {
      linesRef.current = [];
      for (let i = 0; i < E.trails; i++) {
        linesRef.current.push(new LineClass(0.4 + (i / E.trails) * 0.025));
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const render = () => {
      if (!runningRef.current) return;
      
      // Skip rendering when idle to save CPU/GPU
      if (isIdle) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      
      // RISEgold: 43 49% 61%
      ctx.strokeStyle = `hsla(43, 49%, 61%, 0.2)`;
      ctx.lineWidth = 1;

      for (const line of linesRef.current) {
        line.update();
        line.draw(ctx);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      
      // Reset idle state on movement
      isIdle = false;
      if (idleTimeout) {
        clearTimeout(idleTimeout);
      }
      idleTimeout = window.setTimeout(() => {
        isIdle = true;
      }, IDLE_DELAY);
    };

    const handleFirstMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      initLines();
      document.removeEventListener('mousemove', handleFirstMove);
      document.addEventListener('mousemove', handleMouseMove);
      render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', handleFirstMove);

    return () => {
      runningRef.current = false;
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleFirstMove);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Hide cursor during page transitions or on landing page
  if (isTransitioning || isLandingPage) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999] hidden md:block"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default FluidCursor;
