import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);
  
  // Refs to capture old and new page content
  const prevChildrenRef = useRef(children);
  const nextChildrenRef = useRef(children);
  const isTransitioningRef = useRef(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  // Capture children on every render
  useEffect(() => {
    if (!isTransitioningRef.current) {
      // Not transitioning - update the "previous" ref with current content
      prevChildrenRef.current = children;
    }
    // Always update next ref with the latest children (the new page)
    nextChildrenRef.current = children;
  });

  useEffect(() => {
    // Only trigger transition if path actually changed
    if (location.pathname === prevPath) {
      return;
    }

    // Start transition - lock in the old content
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    setPrevPath(location.pathname);
    
    // Keep showing old page content during transition
    setDisplayChildren(prevChildrenRef.current);
    
    // Swap to new page content after black circle fully covers screen
    const updateTimer = setTimeout(() => {
      setDisplayChildren(nextChildrenRef.current);
    }, 5200); // After 5s circle expand + buffer

    // End transition after full cycle
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
      isTransitioningRef.current = false;
    }, 11000); // Total: expand (5s) + hold (1s) + contract (5s)

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname, prevPath]);

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 z-[200] pointer-events-none" key={location.pathname}>
          {/* Black circle expanding from center, behind the logo */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className="bg-black rounded-full"
              style={{
                width: "200vmax",
                height: "200vmax",
                transform: "scale(0)",
                animation: "circleExpand 5s ease-in-out 0s forwards, circleContract 5s ease-in-out 6s forwards",
              }}
            />
          </div>

          {/* Logo on top of black overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <img 
              src={logo} 
              alt="RISE" 
              className="h-16 md:h-20"
              style={{
                animation: "logoFadeIn 0.6s ease-out forwards, logoPulse 0.4s ease-out 1.2s forwards, logoFadeOut 0.6s ease-out 2s forwards",
                opacity: 0,
              }}
            />
          </div>
        </div>
      )}
      
      <div className="opacity-100 transition-opacity duration-300">
        {displayChildren}
      </div>

      <style>{`
        @keyframes logoFadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes logoPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes logoFadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        
        @keyframes circleExpand {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes circleContract {
          from {
            transform: scale(1);
            opacity: 1;
          }
          to {
            transform: scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
