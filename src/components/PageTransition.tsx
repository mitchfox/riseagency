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

    // After 5s (transition out), actually switch the rendered route
    const showNewTimer = setTimeout(() => {
      setDisplayLocation(location);
    }, 5000);

    // After another 5s (transition in), end the overlay
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 10000);

    return () => {
      clearTimeout(showNewTimer);
      clearTimeout(endTimer);
    };
  }, [location, displayLocation]);

  return (
    <>
      {/* Render routes based on the queued displayLocation */}
      {children(displayLocation)}

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
                // 5s expand, then 5s contract
                animation:
                  "circleExpand 5s ease-in-out 0s forwards, circleContract 5s ease-in-out 5s forwards",
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
