import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from "react-icons/fa";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-primary/10">
      <div className="container mx-auto px-4 py-12">
        {/* Logo & Description - Most Prominent */}
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-4">
          <img src={logo} alt="RISE Football Agency" className="h-14 mx-auto" />
          <p className="text-muted-foreground text-base leading-relaxed">
            Professional football representation helping players reach their full potential.
          </p>
        </div>

        {/* Compact sections underneath */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8">
          {/* Quick Links - Two columns */}
          <div>
            <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground mb-4">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Home
              </Link>
              <Link to="/stars" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Stars
              </Link>
              <Link to="/players" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Players
              </Link>
              <Link to="/clubs" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Clubs
              </Link>
              <Link to="/coaches" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Coaches
              </Link>
              <Link to="/scouts" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Scouts
              </Link>
              <Link to="/performance" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Performance
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                About
              </Link>
              <Link to="/news" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                News
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground mb-4">
              Contact
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Get In Touch
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:jolon.levene@risefootballagency.com"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  General Enquiries
                </a>
              </li>
              <li>
                <a 
                  href="mailto:kuda.butawo@risefootballagency.com"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Media & Sponsors
                </a>
              </li>
              <li>
                <a 
                  href="http://wa.link/mabnsw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground mb-4">
              Follow Us
            </h3>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/rise.footballagency"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="Instagram"
              >
                <FaInstagram className="w-6 h-6" />
              </a>
              <a
                href="https://x.com/RISE_FTBL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="X (Twitter)"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
              <a
                href="https://www.linkedin.com/company/rise-football-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-6 h-6" />
              </a>
              <a
                href="https://www.youtube.com/@RISEFootball"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                aria-label="YouTube"
              >
                <FaYoutube className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Compact */}
        <div className="pt-6 border-t border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} RISE Football Agency. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a 
                href="https://www.youtube.com/@RISEFootball" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                RISE Podcast
              </a>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
