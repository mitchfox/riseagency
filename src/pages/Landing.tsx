import { Link } from "react-router-dom";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HoverText } from "@/components/HoverText";
import { MatrixPlayerEffect } from "@/components/MatrixPlayerEffect";
import blackMarble from "@/assets/black-marble-smudged.png";

export default function Landing() {
  const navLinks = [
    { to: "/stars", label: "PLAYERS" },
    { to: "/coaches", label: "COACHES" },
    { to: "/home", label: "HOME" },
    { to: "/clubs", label: "CLUBS" },
    { to: "/agents", label: "AGENTS" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-end relative overflow-hidden cursor-none md:cursor-none">
      {/* Marble Background - Full Screen */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${blackMarble})` }}
      />
      
      {/* Matrix Player Effect - Over Video */}
      <div className="absolute inset-0">
        <MatrixPlayerEffect />
      </div>

      {/* Bottom Section - Navigation + Language Selector in Golden Box */}
      <div className="pb-4 md:pb-12 z-10 relative px-2 md:px-0 w-full md:w-auto">
        <div className="border-2 border-primary/60 bg-black/40 backdrop-blur-sm px-2 py-2 md:py-3">
          {/* Navigation Links - Grid on mobile, row on desktop */}
          <nav className="grid grid-cols-3 md:flex md:flex-row items-center justify-center gap-1 md:gap-0">
            {navLinks.map((link, index) => (
              <div key={link.to} className="flex items-center justify-center">
                <Link
                  to={link.to}
                  className="px-2 md:px-8 py-1 md:py-0 text-xs md:text-base font-bebas uppercase tracking-[0.1em] md:tracking-[0.2em] text-white/80 hover:text-primary transition-colors duration-300"
                >
                  <HoverText text={link.label} />
                </Link>
                {index < navLinks.length - 1 && (
                  <div className="hidden md:block w-px h-4 bg-primary/50" />
                )}
              </div>
            ))}
          </nav>
          
          {/* Language Selector - Below with divider */}
          <div className="border-t border-primary/40 mt-2 md:mt-3 pt-2 md:pt-3 flex justify-center md:ml-[33px]">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
