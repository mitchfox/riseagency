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

          {/* Central pulse — gold ring expanding outward from the centre. */}
          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
            <span
              aria-hidden="true"
              className="block rounded-full border border-primary/60"
              style={{
                width: "24px",
                height: "24px",
                boxShadow: "0 0 60px hsl(var(--gold) / 0.45)",
                animation: "pageTransitionPulse 1.6s ease-out 0.2s 1 both",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute block rounded-full border border-primary/40"
              style={{
                width: "24px",
                height: "24px",
                animation: "pageTransitionPulse 1.6s ease-out 0.5s 1 both",
              }}
            />
          </div>

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

        @keyframes pageTransitionPulse {
          0% {
            transform: scale(0);
            opacity: 0.9;
          }
          70% {
            opacity: 0.35;
          }
          100% {
            transform: scale(120);
            opacity: 0;
          }
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
