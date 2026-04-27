import { useEffect, useState } from "react";
import { useLocation, type Location } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useTransition } from "@/contexts/TransitionContext";

interface PageTransitionProps {
  children: (displayLocation: Location) => React.ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setIsTransitioning: setGlobalTransitioning } = useTransition();

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;

    setIsTransitioning(true);
    setGlobalTransitioning(true);

    const showNewTimer = setTimeout(() => {
      setDisplayLocation(location);
    }, 1000);

    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
      setGlobalTransitioning(false);
    }, 2000);

    return () => {
      clearTimeout(showNewTimer);
      clearTimeout(endTimer);
    };
  }, [location, displayLocation, setGlobalTransitioning]);

  return (
    <>
      {children(displayLocation)}

      {isTransitioning && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none"
          key={location.pathname}
          style={{
            animation: "overlayFadeIn 0.2s ease-out forwards, overlayFadeOut 0.25s ease-out 1.75s forwards",
          }}
        >
          {/* Solid base */}
          <div className="absolute inset-0 z-10 bg-background" />

          {/* Horizontal gold streak shooting across the centre */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-15 h-[1px] w-[1px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70"
            style={{
              boxShadow: "0 0 48px hsl(var(--gold) / 0.85)",
              animation: "pageStreak 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards",
            }}
          />
          {/* Expanding gold ring */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-15 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50"
            style={{
              animation: "pageRing 1.7s cubic-bezier(0.22, 1, 0.36, 1) 0.05s forwards",
              opacity: 0,
            }}
          />

          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <img
              src={logo}
              alt="RISE"
              className="h-16 md:h-20"
              style={{
                animation:
                  "logoFadeIn 0.4s ease-out forwards, logoPulse 0.3s ease-out 0.8s forwards, logoFadeOut 0.4s ease-out 1.3s forwards",
                opacity: 0,
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes overlayFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes pageStreak {
          0%   { transform: translate(-50%, -50%) scaleX(0);    opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) scaleX(2200); opacity: 0; }
        }

        @keyframes pageRing {
          0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0; }
          30%  { opacity: 0.72; }
          100% { transform: translate(-50%, -50%) scale(5.8);  opacity: 0; }
        }

        @keyframes riseSliderCover {
          from { transform: translateX(-100%); }
          to { transform: translateX(0%); }
        }

        @keyframes riseSliderReveal {
          from { transform: translateX(0%); }
          to { transform: translateX(100%); }
        }

        @keyframes riseCentreCover {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes riseCentreReveal {
          from { width: 0%; }
          to { width: 100%; }
        }

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
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
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
      `}</style>
    </>
  );
};
