import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-primary/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <img src={logo} alt="RISE Football Agency" className="h-10" />
            <p className="text-muted-foreground text-sm">
              Professional football representation helping players reach their full potential.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/stars" className="text-muted-foreground hover:text-primary transition-colors">
                  Stars
                </Link>
              </li>
              <li>
                <Link to="/players" className="text-muted-foreground hover:text-primary transition-colors">
                  Players
                </Link>
              </li>
              <li>
                <Link to="/clubs" className="text-muted-foreground hover:text-primary transition-colors">
                  Clubs
                </Link>
              </li>
              <li>
                <Link to="/coaches" className="text-muted-foreground hover:text-primary transition-colors">
                  Coaches
                </Link>
              </li>
              <li>
                <Link to="/agents" className="text-muted-foreground hover:text-primary transition-colors">
                  Agents
                </Link>
              </li>
              <li>
                <Link to="/performance" className="text-muted-foreground hover:text-primary transition-colors">
                  Performance
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/news" className="text-muted-foreground hover:text-primary transition-colors">
                  News
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground mb-4">
              Contact
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Get In Touch
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:jolon.levene@risefootballagency.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Email Us
                </a>
              </li>
              <li>
                <a 
                  href="http://wa.link/mabnsw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
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
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram className="w-6 h-6" />
              </a>
              <a
                href="https://x.com/RISE_FTBL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="X (Twitter)"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
              <a
                href="https://www.linkedin.com/company/rise-football-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} RISE Football Agency. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
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
