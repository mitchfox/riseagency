import { Link } from "react-router-dom";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Landing() {
  const navLinks = [
    { to: "/home", label: "HOME" },
    { to: "/stars", label: "PLAYERS" },
    { to: "/coaches", label: "COACHES" },
    { to: "/clubs", label: "CLUBS" },
    { to: "/agents", label: "AGENTS" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-4xl md:text-6xl font-bebas uppercase tracking-[0.2em] text-white hover:text-primary transition-colors duration-300"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
