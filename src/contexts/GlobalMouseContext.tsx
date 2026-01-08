import { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from "react";

interface MouseState {
  x: number;
  y: number;
  normalizedX: number; // 0-1 across viewport
  normalizedY: number; // 0-1 across viewport (inverted for WebGL)
  velocityX: number;
  velocityY: number;
  speed: number;
  isMoving: boolean;
  lastMoveTime: number;
}

type MouseSubscriber = (state: MouseState) => void;

interface GlobalMouseContextType {
  subscribe: (callback: MouseSubscriber) => () => void;
  getState: () => MouseState;
}

const GlobalMouseContext = createContext<GlobalMouseContextType | null>(null);

const IDLE_THRESHOLD = 100; // ms before considered idle

export const GlobalMouseProvider = ({ children }: { children: ReactNode }) => {
  const stateRef = useRef<MouseState>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    normalizedX: 0.5,
    normalizedY: 0.5,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    isMoving: false,
    lastMoveTime: 0,
  });
  
  const subscribersRef = useRef<Set<MouseSubscriber>>(new Set());
  const rafIdRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  const notifySubscribers = useCallback(() => {
    const state = stateRef.current;
    subscribersRef.current.forEach(callback => callback(state));
  }, []);

  const subscribe = useCallback((callback: MouseSubscriber) => {
    subscribersRef.current.add(callback);
    // Immediately call with current state
    callback(stateRef.current);
    
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const state = stateRef.current;
      
      // Calculate velocity
      const dx = e.clientX - state.x;
      const dy = e.clientY - state.y;
      const dt = now - lastUpdateRef.current || 16;
      
      state.velocityX = dx / dt * 16; // Normalize to ~60fps
      state.velocityY = dy / dt * 16;
      state.speed = Math.sqrt(state.velocityX ** 2 + state.velocityY ** 2);
      
      // Update position
      state.x = e.clientX;
      state.y = e.clientY;
      state.normalizedX = e.clientX / window.innerWidth;
      state.normalizedY = 1 - (e.clientY / window.innerHeight);
      state.isMoving = true;
      state.lastMoveTime = now;
      
      lastUpdateRef.current = now;
      
      // Batch updates with rAF
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          notifySubscribers();
          rafIdRef.current = 0;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const now = performance.now();
        const state = stateRef.current;
        
        const dx = touch.clientX - state.x;
        const dy = touch.clientY - state.y;
        const dt = now - lastUpdateRef.current || 16;
        
        state.velocityX = dx / dt * 16;
        state.velocityY = dy / dt * 16;
        state.speed = Math.sqrt(state.velocityX ** 2 + state.velocityY ** 2);
        
        state.x = touch.clientX;
        state.y = touch.clientY;
        state.normalizedX = touch.clientX / window.innerWidth;
        state.normalizedY = 1 - (touch.clientY / window.innerHeight);
        state.isMoving = true;
        state.lastMoveTime = now;
        
        lastUpdateRef.current = now;
        
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            notifySubscribers();
            rafIdRef.current = 0;
          });
        }
      }
    };

    // Idle detection loop
    let idleCheckId: number;
    const checkIdle = () => {
      const state = stateRef.current;
      const now = performance.now();
      
      if (state.isMoving && now - state.lastMoveTime > IDLE_THRESHOLD) {
        state.isMoving = false;
        state.velocityX *= 0.9;
        state.velocityY *= 0.9;
        state.speed *= 0.9;
        notifySubscribers();
      }
      
      idleCheckId = requestAnimationFrame(checkIdle);
    };
    idleCheckId = requestAnimationFrame(checkIdle);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove as any, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove as any);
      cancelAnimationFrame(idleCheckId);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [notifySubscribers]);

  return (
    <GlobalMouseContext.Provider value={{ subscribe, getState }}>
      {children}
    </GlobalMouseContext.Provider>
  );
};

export const useGlobalMouse = () => {
  const context = useContext(GlobalMouseContext);
  if (!context) {
    // Return a fallback for components outside the provider
    return {
      subscribe: () => () => {},
      getState: () => ({
        x: 0,
        y: 0,
        normalizedX: 0.5,
        normalizedY: 0.5,
        velocityX: 0,
        velocityY: 0,
        speed: 0,
        isMoving: false,
        lastMoveTime: 0,
      }),
    };
  }
  return context;
};
