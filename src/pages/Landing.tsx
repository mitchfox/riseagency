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
    <div className="min-h-screen bg-black flex flex-col items-center justify-end relative overflow-hidden cursor-none">
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
      <div className="pb-12 z-10 relative">
        <div className="border-2 border-primary/60 bg-black/40 backdrop-blur-sm px-2 py-3">
          {/* Navigation Links with Dividers */}
          <nav className="flex items-center justify-center">
            {navLinks.map((link, index) => (
              <div key={link.to} className="flex items-center">
                <Link
                  to={link.to}
                  className="px-6 md:px-8 text-sm md:text-base font-bebas uppercase tracking-[0.2em] text-white/80 hover:text-primary transition-colors duration-300"
                >
                  <HoverText text={link.label} />
                </Link>
                {index < navLinks.length - 1 && (
                  <div className="w-px h-4 bg-primary/50" />
                )}
              </div>
            ))}
          </nav>
          
          {/* Language Selector - Below with divider */}
          <div className="border-t border-primary/40 mt-3 pt-3 flex justify-center ml-[33px]">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
