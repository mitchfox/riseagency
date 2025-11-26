import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [frozenContent, setFrozenContent] = useState<React.ReactNode>(null);
  
  // Always keep track of the last rendered children
  const lastChildrenRef = useRef(children);
  
  // Update ref when NOT transitioning
  useEffect(() => {
    if (!isTransitioning) {
      lastChildrenRef.current = children;
    }
  }, [children, isTransitioning]);

  useEffect(() => {
    // Only trigger transition if path actually changed
    if (location.pathname === prevPath) {
      return;
    }

    // Freeze the PREVIOUS content (before React Router updated children)
    setFrozenContent(lastChildrenRef.current);
    
    // Start transition
    setIsTransitioning(true);
    setPrevPath(location.pathname);

    // Clear frozen content and show new page after black circle fully covers screen
    const updateTimer = setTimeout(() => {
      setFrozenContent(null);
    }, 5200); // After 5s circle expand + small buffer

    // End transition after expand + hold + contract animations
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 11000); // Total: expand (5s) + hold (1s) + contract (5s)

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname, prevPath]);

  return (
    <>
      {/* New page content - always rendered but hidden during transition */}
      <div className={frozenContent ? "invisible" : "visible"}>
        {children}
      </div>

      {/* Frozen old page content as fixed overlay during transition */}
      {frozenContent && (
        <div className="fixed inset-0 z-[150] overflow-auto">
          {frozenContent}
        </div>
      )}

      {/* Black circle transition overlay */}
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
                animation:
                  "circleExpand 5s ease-in-out 0s forwards, circleContract 5s ease-in-out 6s forwards",
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
                animation:
                  "logoFadeIn 0.6s ease-out forwards, logoPulse 0.4s ease-out 1.2s forwards, logoFadeOut 0.6s ease-out 2s forwards",
                opacity: 0,
              }}
            />
          </div>
        </div>
      )}

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
