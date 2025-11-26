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

  // Handle route changes and drive transition timing
  useEffect(() => {
    // Only trigger transition if path actually changed
    if (location.pathname === prevPath) {
      return;
    }

    // Start transition - lock in the old content
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    // Ensure prevChildrenRef holds whatever is currently on screen (old page)
    prevChildrenRef.current = displayChildren;

    setPrevPath(location.pathname);

    // Keep showing old page content during transition-out
    setDisplayChildren(prevChildrenRef.current);

    // Swap to new page content after black circle fully covers the screen
    const updateTimer = setTimeout(() => {
      setDisplayChildren(nextChildrenRef.current);
    }, 5200); // After 5s circle expand + small buffer

    // End transition after expand + hold + contract animations
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
      isTransitioningRef.current = false;
    }, 11000); // Total: expand (5s) + hold (1s) + contract (5s)

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname, prevPath, displayChildren]);

  // Keep refs in sync with the latest routed children
  useEffect(() => {
    // Always track the latest routed children as the next page
    nextChildrenRef.current = children;

    // When we're not in a transition, keep prev in sync and render normally
    if (!isTransitioningRef.current) {
      prevChildrenRef.current = children;
      setDisplayChildren(children);
    }
  }, [children]);

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

      <div className="opacity-100 transition-opacity duration-300">{displayChildren}</div>

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
