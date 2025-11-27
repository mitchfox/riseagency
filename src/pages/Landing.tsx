import { Link } from "react-router-dom";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HoverText } from "@/components/HoverText";
import logo from "@/assets/logo.png";

export default function Landing() {
  const navLinks = [
    { to: "/stars", label: "PLAYERS" },
    { to: "/coaches", label: "COACHES" },
    { to: "/home", label: "HOME" },
    { to: "/clubs", label: "CLUBS" },
    { to: "/agents", label: "AGENTS" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center relative overflow-hidden">
      {/* Subtle glow effect behind center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      {/* Logo - Top Center */}
      <div className="pt-8 md:pt-12">
        <img 
          src={logo} 
          alt="Rise Logo" 
          className="w-20 md:w-24 h-auto"
        />
      </div>

      {/* Main Content - Centered */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        {/* REALISE POTENTIAL Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-[0.3em] text-white/90 text-center">
          <HoverText text="REALISE POTENTIAL" />
        </h1>
      </div>

      {/* Bottom Section - Language Selector + Navigation */}
      <div className="pb-12 flex flex-col items-center gap-6">
        {/* Language Selector - Above HOME */}
        <LanguageSelector />
        
        {/* Navigation Links */}
        <nav className="flex items-center justify-center gap-8 md:gap-16 px-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm md:text-base font-bebas uppercase tracking-[0.2em] text-white/60 hover:text-primary transition-colors duration-300"
            >
              <HoverText text={link.label} />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
