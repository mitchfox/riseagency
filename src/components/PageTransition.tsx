import { useEffect, useState } from "react";
import { useLocation, type Location } from "react-router-dom";
import logo from "@/assets/logo.png";

interface PageTransitionProps {
  children: (displayLocation: Location) => React.ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // If the URL changed but our displayed location hasn't, start a queued transition
    if (location.pathname === displayLocation.pathname) return;

    setIsTransitioning(true);

    // After 1.5s (transition out), actually switch the rendered route
    const showNewTimer = setTimeout(() => {
      setDisplayLocation(location);
    }, 1500);

    // After another 1.5s (transition in), end the overlay
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 3000);

    return () => {
      clearTimeout(showNewTimer);
      clearTimeout(endTimer);
    };
  }, [location, displayLocation]);

  return (
    <>
      {/* Render routes based on the queued displayLocation */}
      {children(displayLocation)}

      {/* Branching roots transition overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[200] pointer-events-none" key={location.pathname}>
          {/* Multiple branching shapes expanding from center */}
          <div className="absolute inset-0 z-10">
            {/* Center root */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(45% 0%, 55% 0%, 55% 100%, 45% 100%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.5s forwards",
                }}
              />
            </div>
            
            {/* Left upper branch */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(50% 50%, 0% 20%, 0% 40%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.6s forwards",
                }}
              />
            </div>
            
            {/* Left lower branch */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(50% 50%, 0% 60%, 0% 80%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.65s forwards",
                }}
              />
            </div>
            
            {/* Right upper branch */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(50% 50%, 100% 20%, 100% 40%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.62s forwards",
                }}
              />
            </div>
            
            {/* Right lower branch */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(50% 50%, 100% 60%, 100% 80%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.68s forwards",
                }}
              />
            </div>
            
            {/* Top branches */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(40% 50%, 20% 0%, 40% 0%, 50% 40%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.7s forwards",
                }}
              />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(60% 50%, 80% 0%, 60% 0%, 50% 40%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.22s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.72s forwards",
                }}
              />
            </div>
            
            {/* Bottom branches */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(40% 50%, 20% 100%, 40% 100%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.75s forwards",
                }}
              />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-black"
                style={{
                  width: "150vmax",
                  height: "150vmax",
                  clipPath: "polygon(60% 50%, 80% 100%, 60% 100%, 50% 60%)",
                  transform: "scale(0)",
                  animation: "branchExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.27s forwards, branchContract 1.5s cubic-bezier(0.7, 0, 0.84, 0) 1.77s forwards",
                }}
              />
            </div>
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
        
        @keyframes branchExpand {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes branchContract {
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
