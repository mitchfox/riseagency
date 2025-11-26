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
    
    // Update children after logo appears and before reveal
    const updateTimer = setTimeout(() => {
      setDisplayChildren(children);
    }, 800);

    // End transition after full animation
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1600);

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(endTimer);
    };
  }, [location.pathname]);

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          {/* Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src={logo} 
              alt="RISE" 
              className="h-16 md:h-20 animate-fade-in"
              style={{
                animation: "fade-in 0.5s ease-out 0.3s forwards, scale-in 0.5s ease-out 0.3s forwards, fade-out 0.3s ease-out 1.1s forwards",
                opacity: 0,
              }}
            />
          </div>
          
          {/* Black overlay expanding from center */}
          <div 
            className="absolute inset-0 bg-black"
            style={{
              animation: "expandFromCenter 0.6s ease-out 0.4s forwards, fadeFromCenter 0.6s ease-out 1s forwards",
              clipPath: "circle(0% at 50% 50%)",
            }}
          />
        </div>
      )}
      
      <div className={isTransitioning ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>
        {displayChildren}
      </div>

      <style>{`
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
