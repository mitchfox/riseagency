import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Start transition when route changes
    setIsTransitioning(true);
    
    // Update children once black overlay fully covers the screen
    const updateTimer = setTimeout(() => {
      setDisplayChildren(children);
    }, 2000); // After black expand completes (1.5s) + small buffer

    // End transition after expand + hold + contract animations
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 4000); // Total: expand (1.5s) + hold (1.0s) + contract (1.5s)

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname, children]); // Triggers on every route change

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 z-[200] pointer-events-none" key={location.pathname}>
          {/* Black overlay expanding from center, behind the logo */}
          <div
            className="absolute inset-0 bg-black z-10"
            style={{
              animation: "expandFromCenter 1.5s ease-in-out 0s forwards, contractToCenter 1.5s ease-in-out 2.5s forwards",
              clipPath: "circle(0% at 50% 50%)",
            }}
          />

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
        
        @keyframes expandFromCenter {
          from {
            clip-path: circle(0% at 50% 50%);
            opacity: 0;
          }
          to {
            clip-path: circle(150% at 50% 50%);
            opacity: 1;
          }
        }
        
        @keyframes contractToCenter {
          from {
            clip-path: circle(150% at 50% 50%);
            opacity: 1;
          }
          to {
            clip-path: circle(0% at 50% 50%);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
