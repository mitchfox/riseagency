import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Left spacer */}
          <div className="w-12" />

          {/* Logo - Center */}
          <Link to="/" className="flex-shrink-0">
            <div className="text-3xl font-bebas text-primary tracking-widest">
              FOOTBALL AGENCY
            </div>
          </Link>

          {/* Burger Menu - Right */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="group relative w-12 h-12 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-5 flex flex-col justify-between">
              {!isMenuOpen ? (
                <>
                  <span className="block w-full h-0.5 bg-primary transform transition-all duration-300 group-hover:bg-foreground" />
                  <span className="block w-full h-0.5 bg-primary transform transition-all duration-300 group-hover:bg-foreground" />
                  <span className="block w-full h-0.5 bg-primary transform transition-all duration-300 group-hover:bg-foreground" />
                </>
              ) : (
                <X className="w-6 h-6 text-primary group-hover:text-foreground transition-colors" />
              )}
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="absolute top-full left-0 right-0 bg-background border-b border-primary/20 py-6">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider"
              >
                Players
              </Link>
              <Link
                to="/about"
                onClick={() => setIsMenuOpen(false)}
                className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider"
              >
                About
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="text-xl font-bebas uppercase text-foreground hover:text-primary transition-colors tracking-wider"
              >
                Contact
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
