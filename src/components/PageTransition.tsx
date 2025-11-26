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
    
    // Update children after logo appears and black fills
    const updateTimer = setTimeout(() => {
      setDisplayChildren(children);
    }, 1500); // After fade in (1s) + half of expansion

    // End transition after full animation
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 3000); // Total: fade in (1s) + black expand + fade out (1s)

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname]); // Triggers on every route change

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          {/* Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src={logo} 
              alt="RISE" 
              className="h-16 md:h-20"
              style={{
                animation: "logoFadeIn 1s ease-out forwards, logoFadeOut 1s ease-out 2s forwards",
                opacity: 0,
              }}
            />
          </div>
          
          {/* Black overlay expanding from center */}
          <div 
            className="absolute inset-0 bg-black"
            style={{
              animation: "expandFromCenter 0.8s ease-out 1s forwards, fadeFromCenter 1s ease-out 2s forwards",
              clipPath: "circle(0% at 50% 50%)",
            }}
          />
        </div>
      )}
      
      <div className={isTransitioning ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>
        {displayChildren}
      </div>

      <style>{`
        @keyframes logoFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
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
            transform: scale(1.1);
          }
        }
        
        @keyframes expandFromCenter {
          from {
            clip-path: circle(0% at 50% 50%);
          }
          to {
            clip-path: circle(150% at 50% 50%);
          }
        }
        
        @keyframes fadeFromCenter {
          from {
            clip-path: circle(150% at 50% 50%);
            opacity: 1;
          }
          to {
            clip-path: circle(150% at 50% 50%);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
