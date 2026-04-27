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

          {/* Soft gold radial glow behind the logo so rings appear to originate from it */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-[12] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--gold) / 0.35) 0%, hsl(var(--gold) / 0.12) 35%, transparent 70%)",
              filter: "blur(8px)",
              animation: "shockGlow 1.9s ease-out 0.05s forwards",
              opacity: 0,
            }}
          />

          {/* Concentric gold/white shockwave rings — staggered like a sonar pulse */}
          {[
            { delay: 0.05, color: "hsl(var(--gold) / 0.85)", thickness: 2 },
            { delay: 0.25, color: "hsl(0 0% 100% / 0.75)", thickness: 1.5 },
            { delay: 0.45, color: "hsl(var(--gold) / 0.7)",  thickness: 1.5 },
            { delay: 0.65, color: "hsl(0 0% 100% / 0.55)", thickness: 1 },
          ].map((ring, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 z-[14] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                border: `${ring.thickness}px solid ${ring.color}`,
                boxShadow:
                  i % 2 === 0
                    ? "0 0 32px hsl(var(--gold) / 0.55), inset 0 0 16px hsl(var(--gold) / 0.25)"
                    : "0 0 24px hsl(0 0% 100% / 0.45)",
                animation: `shockRing 1.7s cubic-bezier(0.22, 1, 0.36, 1) ${ring.delay}s forwards`,
                opacity: 0,
              }}
            />
          ))}

          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <img
              src={logo}
              alt="RISE"
              className="h-16 md:h-20"
              style={{
                animation:
                  "logoFadeIn 0.35s ease-out forwards, logoBreathe 1.4s ease-in-out 0.35s infinite, logoFadeOut 0.35s ease-out 1.7s forwards",
                opacity: 0,
                filter: "drop-shadow(0 0 18px hsl(var(--gold) / 0.55))",
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

        @keyframes shockRing {
          0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(14);   opacity: 0; }
        }

        @keyframes shockGlow {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }

        @keyframes logoBreathe {
          0%, 100% { transform: scale(1);    opacity: 0.92; }
          50%      { transform: scale(1.08); opacity: 1; }
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
