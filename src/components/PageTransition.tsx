import { useEffect, useState } from "react";
import { useLocation, type Location } from "react-router-dom";
import logo from "@/assets/logo.png";
import logoWhite from "@/assets/RISEWhite.png";
import { ShaderAnimation } from "@/components/ui/shader-animation";
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

  const useRiseSliderTransition =
    location.pathname.startsWith("/request-representation") || displayLocation.pathname.startsWith("/request-representation");

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
          {useRiseSliderTransition ? (
            // Centre-out gold reveal with the white RISE logo on top —
            // gold band grows from screen centre out to both edges, then
            // a black band wipes back over to reveal the new page.
            <div className="absolute inset-0 overflow-hidden bg-black">
              <div
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-primary"
                style={{
                  width: "0%",
                  animation: "riseCentreCover 0.72s cubic-bezier(0.77, 0, 0.175, 1) forwards",
                }}
              />
              <div
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-black"
                style={{
                  width: "0%",
                  animation: "riseCentreReveal 0.86s cubic-bezier(0.77, 0, 0.175, 1) 0.45s forwards",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={logoWhite}
                  alt="RISE"
                  className="h-16 md:h-20"
                  style={{
                    animation:
                      "logoFadeIn 0.26s ease-out forwards, logoPulse 0.28s ease-out 0.72s forwards, logoFadeOut 0.34s ease-out 1.22s forwards",
                    opacity: 0,
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 z-10">
                <ShaderAnimation />
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
            </>
          )}
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
